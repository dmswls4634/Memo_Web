import { useState, useEffect } from "react";

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
}

interface SidebarProps {
  notes: Note[];
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
    if (typeof window === "undefined") return;

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
export default function Sidebar({ notes, onSelectNote, onAddNote, onDeleteNote, onTogglePin, isOpen, setIsOpen }: SidebarProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 700px)"); //사이드바가 메모장에 걸쳐짐
  const isSmallScreen = useMediaQuery("(max-width: 650px)"); //사이드바가 화면을 꽉 채움
  //const [isOpen, setIsOpen] = useState(!isMobile);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; noteId: number | null }>({
    visible: false,
    x: 0,
    y: 0,
    noteId: null //우클릭한 메모의 ID
  });

  const handleContextMenu = (event: React.MouseEvent, id: number) => {
    event.preventDefault(); //브라우저의 기본 우클릭 메뉴를 막음
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY-55, noteId: id });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, noteId: null });
  };

  useEffect(() => {
    setIsOpen(!isMobile); // 화면 크기 변경 시, 모바일이면 사이드바가 닫히도록 설정
  }, [isMobile]);
  

  return (
    <>
      <aside
        className={`fixed top-55 overflow-y-auto left-0 shadow-xl transition-all duration-300 easy-in-out bg-white p-4 border-r flex flex-col transition-all duration-300 fixed h-[calc(100vh-56px)] z-50
          ${isOpen ? (isSmallScreen ? "w-full left-0 scrollbar-hide" : "w-80 left-0") : "w-0 left-[-100%] "}
          ${isMobile ? "absolute" : "relative"}`}
        onClick={handleCloseContextMenu} // 컨텍스트 메뉴 외 클릭 시 닫기
      >
        {/* 상단바 (MEMO + 뒤로가기 버튼) */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setIsOpen(!isOpen)}>
            <img src="/back-p.png" alt="Toggle Sidebar" className={`w-6 h-6 transition-transform ${isOpen ? "" : "rotate-180"}`} />
          </button>
          {isOpen && <span className="absolute left-1/2 transform -translate-x-1/2 font-semibold text-lg text-neutral-800">MEMO</span>}
        </div>

        {isOpen && (
          <button onClick={onAddNote} className="w-full font-semibold bg-amber-400 text-white p-2 rounded-md mb-2 hover:bg-yellow-600">
            + 새 메모
          </button>
        )}

        <ul className="flex-1 overflow-auto">
          {/* 고정된 메모 */}
          {notes.filter((note) => note.isPinned).length > 0 && <p className="text-gray-500 font-semibold mt-4 mb-2">📌 고정됨</p>}
          {notes
            .filter((note) => note.isPinned)
            .map((note) => {
              const [title, ...contentLines] = note.content.split("\n");
              const contentPreview = contentLines.join(" ").slice(0, 30);
              return(
                <li
                  key={note.id}
                  onClick={() => {
                    if(isMobile || isSmallScreen) setIsOpen(false);
                    setSelectedId(note.id);
                    onSelectNote(note.id);
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

          {/* 일반 메모 */}
          {notes.filter((note) => !note.isPinned).length > 0 && <p className="text-gray-500 font-semibold mt-4 mb-2">메모</p>}
          {notes
            .filter((note) => !note.isPinned)
            .map((note) => {
              const [title, ...contentLines] = note.content.split("\n");
              const contentPreview = contentLines.join(" ").slice(0, 30);
              return(
                <li
                  key={note.id}
                  onClick={() => {
                    if(isMobile || isSmallScreen) setIsOpen(false);
                    setSelectedId(note.id);
                    onSelectNote(note.id);
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
        </ul>

        {/* 우클릭 메뉴 */}
        {contextMenu.visible && (
          <div
            className="absolute bg-white shadow-lg rounded-lg p-2 text-sm border z-50 "
            style={{ top: contextMenu.y, left: contextMenu.x }}
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
          </div>
        )}
      </aside>
      
      {/* 블러 처리된 배경 & 클릭 시 닫히는 기능 추가 */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-white bg-opacity-80 z-40 transition-all duration-300" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* 사이드바 열기 버튼
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed pt-4 pl-4 text-white p-2 rounded-full z-50"
        >
          <img src="/back-p.png" alt="열기" className="w-6 h-6 rotate-180" />
        </button>
      )}*/}
    </>
  );
}
