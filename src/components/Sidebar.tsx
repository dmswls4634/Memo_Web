import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
}

interface SidebarProps {
  notes: Note[];
  selectedId:number|null;
  onSelectNote: (id: number) => void;
  onAddNote: () => void;
  onDeleteNote: (id: number) => void;
  onTogglePin: (id: number) => void;
  isOpen:boolean;
  setIsOpen:(open:boolean)=>void;
}

//반응형
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState<boolean>(false);
  //const [matches, setMatches] = useState (window.matchMedia(query).matches);

  useEffect(() => {
    if (typeof window === "undefined") return; //SSR특징

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
};

//메모 작성 시간 및 날짜
const formatDate = (dateString: string) => {
  const date = new Date(dateString); //작성 날짜
  const today = new Date(); //오늘 날짜
  
  const isSameday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

    if (isSameday) {
      return date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "numeric" });
    } else {
      return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".");
    }
};

//사이드바
export default function Sidebar({ notes, selectedId, onSelectNote, onAddNote, onDeleteNote, onTogglePin, isOpen, setIsOpen }: SidebarProps) {
  //const [selectedId, setSelectedId] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 700px)"); //사이드바가 메모장에 걸쳐짐
  const isSmallScreen = useMediaQuery("(max-width: 650px)"); //사이드바가 화면을 꽉 채움
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; noteId: number | null }>({
    visible: false,
    x: 0,
    y: 0,
    noteId: null //우클릭한 메모의 ID
  });

  const handleContextMenu = (event: React.MouseEvent, id: number) => {
    event.preventDefault(); //브라우저의 기본 우클릭 메뉴를 막음
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY-55, noteId: id });
  }; ////////y축을 헤더사이즈만큼 할 수 있는지 시도, 사이드바 넘치게 설정

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, noteId: null });
  };

  useEffect(() => { ////////////////코드설명보기
    setIsOpen(!isMobile); // 화면 크기 변경 시, 모바일이면 사이드바가 닫히도록 설정
  }, [isMobile]);

  const stripHtml = (html: string) => {
    return html
      .replace(/<\/p>\s*<p>/g, " <br>") // 연속된 <p> 태그를 <br>로 변환
      .replace(/<\/?p>/g, "") // 남아있는 <p> 태그 제거
      .replace(/<\/?ul>/g, "") // <ul> 태그 제거
      .replace(/<\/?ol>/g, "") // <ol> 태그 제거
      .replace(/<\/?li>/g, "\n") // <li> 태그는 줄바꿈으로 변환
      .replace(/<\/?h2>/g, "\n") // <h2> 태그는 줄바꿈으로 변환
      .replace(/<\/?h3>/g, "\n") // <h3> 태그는 줄바꿈으로 변환
      .replace(/<(?!br\s*\/?)[^>]+>/g, "") // br을 제외한 모든 태그 제거
      .replace(/<br\s*\/?>/g, "\n") // <br>을 줄바꿈으로 변환
      .trim(); // 앞뒤 공백 제거
  };

  //메모 작성
  const renderNotes = (notesList: Note[], title: string) => {
    if (notesList.length === 0) return null;
    return (
      <>
        <p className="text-gray-500 font-semibold mt-4 mb-2">{title}</p>
        {notesList.map((note) => {
          const [title, ...contentLines] = stripHtml(note.content).split("\n");
          const contentPreview = contentLines.join(" ").slice(0, 30);

          return (
            <li
              key={note.id}
              onClick={() => {
                if (isMobile || isSmallScreen) setIsOpen(false);
                //setSelectedId(note.id); //선택된 메모 상태변경
                onSelectNote(note.id); //매모선택
              }}
              onContextMenu={(e) => handleContextMenu(e, note.id)}
                className={`p-2 cursor-pointer rounded-md ${selectedId === note.id ? "bg-amber-100" : "hover:bg-gray-200"}`}
            >
              <div className="truncate text-17px font-semibold">{title || "제목 없음"}</div>
              <div className="flex items-center space-x-2 flex-nowrap overflow-hidden">
                <p className="text-sm text-neutral-600 font-normal whitespace-nowrap">{formatDate(note.createdAt)}</p>
                <p className="text-sm text-gray-400 truncate font-normal min-w-0 flex-1">{contentPreview || "추가 텍스트 없음"}</p>
              </div>
            </li>
          );
        })}
      </>
    );
  };

  // 미리 필터링하여 중복 제거
  const pinnedNotes = notes.filter((note) => note.isPinned);
  const regularNotes = notes.filter((note) => !note.isPinned);

  useEffect(() => { //화면 전체의 스크롤바 숨김
    if (isMobile || isSmallScreen) {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, isMobile, isSmallScreen]);


  return (
    <>
      <aside
        className={`fixed overflow-y-auto shadow-xl transition-all duration-300 easy-in-out bg-white p-4 border-r flex flex-col h-screen h-[calc(100vh-56px)] z-50
          ${isOpen ? (isSmallScreen ? "w-full scrollbar-hide" : "w-80 ") : "w-0 left-[-100%] overflow-hidden"}
          ${isMobile ? "absolute" : "relative"}`}
        onClick={handleCloseContextMenu} // 컨텍스트 메뉴 외 클릭 시 닫기
      >
        
        {/* 상단바 (MEMO + 사이드바 닫기 버튼) */}
        {isOpen&&(
          <div className="flex items-center mb-4">
            <button onClick={() => setIsOpen(false)}>
              <img src="/chevron_left.svg" alt="Toggle Sidebar" className="w-6 h-6 transition-transform select-none"/>
            </button>
            {isOpen && (
              <span className="absolute left-1/2 transform -translate-x-1/2 font-semibold text-lg text-neutral-800 select-none">MEMO</span>
            )}
          </div>
        )}
        {isOpen && (
          <button onClick={onAddNote} className="w-full font-semibold bg-amber-400 text-white p-2 rounded-md mb-2 hover:bg-yellow-600">
            + 새 메모
          </button>
        )}
        {isOpen&&(
          <ul className="flex-1 overflow-auto select-none scrollbar-hide">
            {renderNotes(pinnedNotes, "📌 고정됨")}
            {renderNotes(regularNotes, "메모")}
          </ul>
        )}
      </aside>

      {/* 우클릭 메뉴 */}
      {contextMenu.visible && 
        createPortal(
          <div className="absolute bg-white shadow-lg rounded-lg p-2 text-sm border z-50"
            style={{ top: contextMenu.y-(-65), left: contextMenu.x }}
          >
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-200 hover:rounded-lg"
              onClick={() => {
                if (contextMenu.noteId !== null) onTogglePin(contextMenu.noteId);
                handleCloseContextMenu();
              }}
            >
              {notes.find((n) => n.id === contextMenu.noteId)?.isPinned ? "메모 고정 해제" : "메모 고정"}
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-red-500 hover:bg-red-100 hover:rounded-lg"
              onClick={() => {
                if (contextMenu.noteId !== null) onDeleteNote(contextMenu.noteId);
                handleCloseContextMenu();
              }}
            >
              삭제
            </button>
          </div>,
          document.body
        )
      }

      
      {/* 블러 처리된 배경 & 클릭 시 닫히는 기능 추가 */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-white bg-opacity-80 z-40 transition-all duration-300" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
