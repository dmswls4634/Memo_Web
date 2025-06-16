import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
  folder: string;
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
  onUpdateNoteFolder: (id: number, folder: string) => void;
  onDeleteFolder: (folder: string) => void;
}


const useMediaQuery = (query: string) => { //반응형
  const [matches, setMatches] = useState<boolean>(false);

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


const formatDate = (dateString: string) => { //메모 작성 시간 및 날짜
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


export default function Sidebar({ notes, selectedId, onSelectNote, onAddNote, onDeleteNote, onTogglePin, isOpen, setIsOpen, onUpdateNoteFolder,onDeleteFolder, }: SidebarProps) {
  //const [selectedId, setSelectedId] = useState<number | null>(null);
  const folderMenuRef = useRef<HTMLDivElement | null>(null);

  const [searchTerm, setSearchTerm] = useState(""); //메모 검색
  const [selectedFolder, setSelectedFolder] = useState<string>("전체"); //메모 선택된 폴더
  const [newFolderName, setNewFolderName] = useState(""); // 새 폴더 추가
  const [folders, setFolders] = useState<string[]>(["전체","일기","투두리스트"]);

  const isMobile = useMediaQuery("(max-width: 700px)"); //사이드바가 메모장에 걸쳐짐
  const isSmallScreen = useMediaQuery("(max-width: 650px)"); //사이드바가 화면을 꽉 채움
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; noteId: number | null }>({
    visible: false,
    x: 0,
    y: 0,
    noteId: null 
  }); //메모 우클릭-고정여부, 삭제

  const [folderMenu, setFolderMenu] = useState<{ visible: boolean; x: number; y: number; noteId: number | null }>({
    visible: false,
    x: 0,
    y: 0,
    noteId: null 
  }); //메모 우클릭-폴더 선택


  const handleContextMenu = (event: React.MouseEvent, id: number) => { //메모고정,삭제 메뉴 열기
    event.preventDefault();
    handleCloseFolderMenu();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY-55, noteId: id });
  };


  const handleCloseContextMenu = () => { //메모고정,삭제 메뉴 닫기
    setContextMenu({ visible: false, x: 0, y: 0, noteId: null });
  };


  const handleCloseFolderMenu = () => { //폴더 선택 메뉴 닫기
    setFolderMenu({ visible: false, x: 0, y: 0, noteId: null });
  };


  useEffect(() => {
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


  const filteredNotes = notes.filter((note) => { //메모 검색 기능 & 분류 기능
    const matchesSearch =
      stripHtml(note.content).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder =
      selectedFolder === "전체" || note.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });
  

  // 미리 필터링하여 중복 제거
  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const regularNotes = filteredNotes.filter((note) => !note.isPinned);


  //메모 작성
  const renderNotes = (notesList: Note[], title: string) => {
    if (notesList.length === 0) return null;
    return (
      <>
        <p className="text-gray-500 font-semibold mt-4 mb-2 dark:text-white">{title}</p>
        {notesList.map((note) => {
          const [title, ...contentLines] = stripHtml(note.content).split("\n");
          const contentPreview = contentLines.join(" ").slice(0, 30);

          return (
            <li
              key={note.id}
              onClick={() => {
                if (isMobile || isSmallScreen) setIsOpen(false);
                onSelectNote(note.id); //매모선택
              }}
              onContextMenu={(e) => handleContextMenu(e, note.id)}
                className={`p-2 cursor-pointer rounded-md ${selectedId === note.id ? "bg-amber-100 dark:text-black" : "hover:bg-gray-200 dark:hover:bg-[#333]"}`}
            >
              <div className="truncate text-17px font-semibold">{title || "제목 없음"}</div>
              <div className="flex items-center space-x-2 flex-nowrap overflow-hidden">
                <p className="text-sm text-neutral-600 font-normal whitespace-nowrap">{formatDate(note.createdAt)}</p>
                <p className="text-sm text-gray-400 truncate font-normal min-w-0 flex-1">{contentPreview || "추가 텍스트 없음"}</p>
              </div>
              <div className="flex flex-row items-center mt-1">
                <img src="/folder.svg" className="w-4 h-4 mr-1.5"/>
                <p className="text-sm text-gray-400 truncate font-normal min-w-0 flex-1">{note.folder}</p>
              </div>
            </li>
          );
        })}
      </>
    );
  };


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
        className={`fixed overflow-y-auto shadow-xl transition-all duration-300 easy-in-out bg-white border-r flex flex-col h-screen h-[calc(100vh-56px)] z-50 dark:bg-[#1e1e1e] dark:text-white
          ${isOpen ? (isSmallScreen ? "w-full scrollbar-hide" : "w-80 ") : "w-0 left-[-100%] overflow-hidden "}
          ${isMobile ? "absolute" : "relative"}`}
        onClick={() => {
          handleCloseContextMenu();
          handleCloseFolderMenu();
        }}
      >
        {isOpen&&(
          <>
            <div className="flex items-center mb-4 pt-4 px-4">
              <button onClick={() => setIsOpen(false)}>
                <img src="/chevron_left.svg" alt="Toggle Sidebar" className="w-6 h-6 transition-transform select-none"/>
              </button>
              <span className="absolute left-1/2 transform -translate-x-1/2 font-semibold text-lg text-neutral-800 select-none dark:text-white">MEMO</span>
            </div>
            
            <div className="space-y-2 mb-3 px-4">
              <input className="w-full p-2 text-sm border outline-none rounded-md bg-gray-200"
                type="text"
                placeholder="검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="relative">
                <select className="appearance-none border border-gray-300 text-gray-900 text-sm rounded-md focus:border-amber-400 block w-full p-2"
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                >
                  
                  {folders.map((folder) => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
                <img src="/chevron_right.svg" className="absolute right-2 top-1/2 transform -translate-y-1/2 rotate-90 w-4 h-4 pointer-events-none"/>
              </div>
            </div>
            
            <div className="px-4">
              <button onClick={onAddNote} className="w-full font-semibold bg-amber-400 text-white p-2 rounded-md mb-2 hover:bg-yellow-600">
                + 새 메모
              </button>
            </div>
          
            <ul className="flex-1 px-4 overflow-auto select-none scrollbar-hide">
              {renderNotes(pinnedNotes, "📌 고정됨")}
              {renderNotes(regularNotes, "메모")}
            </ul>
          </>
        )}
      </aside>

      {contextMenu.visible && createPortal( //첫 번째 우클릭 메뉴
        <div className="absolute bg-white shadow-lg rounded-lg p-2 text-sm border z-50 dark:bg-[#1e1e1e]"
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
            className="block w-full text-left px-4 py-2 hover:bg-gray-200 hover:rounded-lg"
            onClick={() => {
              setFolderMenu({
                visible: true,
                x: contextMenu.x,
                y: contextMenu.y,
                noteId: contextMenu.noteId
              });
              handleCloseContextMenu();
            }}
          >
            폴더 선택
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
      )}

      {folderMenu.visible && createPortal(
        <div
          ref={folderMenuRef}
          className="absolute z-50 bg-white border rounded-lg shadow-lg p-2 text-sm w-48"
          style={{ top: folderMenu.y-(-65), left: folderMenu.x }}
        >
          {/* 폴더 리스트 */}
          {folders.map((folder) => (
            <div key={folder} className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (folderMenu.noteId !== null) {
                    onUpdateNoteFolder(folderMenu.noteId, folder);
                  }
                  setFolderMenu({ ...folderMenu, visible: false }); // 메뉴 닫기
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-200 hover:rounded-lg"
              >
                {folder}
              </button>
              {folder !== "전체" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 폴더 선택 버튼 클릭과 분리
                    setFolders(prev => prev.filter(f => f !== folder));
                    onDeleteFolder(folder);
                  }}
                  className="text-red-500 px-1 hover:text-red-700"
                >
                  ✕
                </button>
              )}
            </div>
            
          ))}

          <hr className="py-1" />

          {/* 새 폴더 입력 */}
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) {
                if (!folders.includes(newFolderName.trim())) {
                  const newFolders = [...folders, newFolderName.trim()];
                  setFolders(newFolders);
                  if (folderMenu.noteId !== null) {
                    onUpdateNoteFolder(folderMenu.noteId, newFolderName.trim());
                  }
                  setNewFolderName("");
                  setFolderMenu({ ...folderMenu, visible: false });
                }
              }
            }}
            placeholder="폴더 생성"
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>,
        document.body
      )}

      
      {isMobile && isOpen && ( //블러 처리된 배경 & 클릭 시 닫히는 기능 추가
        <div 
          className="fixed inset-0 bg-white bg-opacity-80 z-40 transition-all duration-300 dark:bg-opacity-30" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
