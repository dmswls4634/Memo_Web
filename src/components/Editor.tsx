import { useState } from "react";

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
}

interface EditorProps {
  selectedNote: Note | null;
  onUpdateNote: (id: number, newContent: string) => void;
  onDeleteNote: (id: number) => void;
  isSidebarOpen: boolean;
  onToggleSidebar:()=>void;
}

export default function Editor({ selectedNote, onUpdateNote, onDeleteNote, isSidebarOpen, onToggleSidebar}: EditorProps) {
  //const [content, setContent] = useState("");
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedNote) {
      onUpdateNote(selectedNote.id, e.target.value);
    }
  };

  if (!selectedNote) {
    return <div className="flex-1 p-4 text-gray-400">메모를 선택해주세요.</div>;
  }

  return (
    <div className="flex-1 pt-[16px] bg-white relative">
      <div>
        {!isSidebarOpen&&(
          <button onClick={onToggleSidebar} className="fixed">
            <img src="/back-p.png" alt="열기" className="w-6 h-6 rotate-180" />
          </button>
        )}

        <div>
        <button className="px-2 py-1 text-sm border rounded">제목</button>
          <button className="px-2 py-1 text-sm border rounded">부제목</button>
          <button className="px-2 py-1 text-sm border rounded">본문</button>
          <button className="px-2 py-1 text-sm border rounded">● 목록</button>
          <button className="px-2 py-1 text-sm border rounded">1. 번호 목록</button>
          <button className="px-2 py-1 text-sm border rounded">━ 선</button>
          <button className="px-2 py-1 text-sm border rounded">✔ 체크리스트</button>
        </div>

        <button className="p-2" onClick={() => onDeleteNote(selectedNote.id)}>
          <img src="/recyclebin.png" className="w-5 h-5" alt="삭제" />
        </button>
      </div>
      
      {selectedNote ? (
        <textarea
          className="w-full h-full mt-10 p-2 rounded-md focus:outline-none pt-2"
          placeholder="메모를 작성하세요."
          value={selectedNote.content}
          onChange={handleChange}
        />
      ) : (
        <p className="text-gray-500 text-center mt-20">메모를 선택하세요</p>
      )}
    </div>
  );
}
