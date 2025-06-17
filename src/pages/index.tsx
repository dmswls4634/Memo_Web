import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
  folder: string;
}

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]); //상태의 타입이 객제이거나 배열일 때
  const [selectedNote, setSelectedNote] = useState<Note | null>(null); //null일 수도 아닐 수도
  const [isOpen, setIsOpen]=useState<boolean>(false); //사이드바 false

  const handleToggleSidebar = () => { //사이드바 관리
    setIsOpen((prev) => !prev); //현재상태의 반대로
  };

  const handleAddNote = () => { //메모추가
    const newNote: Note = { id: Date.now(), title: "새 메모", content: "", isPinned: false, createdAt: new Date().toISOString(), folder:"전체" };
    setNotes([newNote, ...notes]); //기존 메모 앞에 추가
    setSelectedNote(newNote);
  };

  const handleUpdateNote = (id: number, newContent: string) => { //메모수정
    setNotes(notes.map((note) => (note.id === id ? { ...note, content: newContent, } : note)));
    if (selectedNote) setSelectedNote({ ...selectedNote, content: newContent });
  };

  const handleDeleteNote = (id: number) => { //메모삭제
    if (!selectedNote) return;
    
    const isPinned = selectedNote.isPinned; //고정여부 확인

    const pinnedNote = notes.filter((note)=>note.isPinned);
    const unpinnedNote = notes.filter((note)=>!note.isPinned);

    const targetNotes = isPinned?pinnedNote:unpinnedNote;
    const noteIndex = targetNotes.findIndex((note)=>note.id===id);

    const updatedNotes=notes.filter((note)=>note.id!==id); //메모 삭제
    
    setNotes(updatedNotes);

    let nextSelectedNote = null;

    if(isPinned){
      const updatedPinnedNotes = updatedNotes.filter((note)=>note.isPinned);
      if(updatedPinnedNotes.length>0){
        const nextIndex = noteIndex<updatedPinnedNotes.length?noteIndex:updatedPinnedNotes.length-1;
        nextSelectedNote = updatedPinnedNotes[nextIndex];
      }
      else{
        const updatedPinnedNotes = updatedNotes.filter((note)=>!note.isPinned);
        if(updatedPinnedNotes.length>0){
          nextSelectedNote = updatedPinnedNotes[0];
        }
      }
    }
    else{
      const updatedUnpinnedNotes = updatedNotes.filter((note) => !note.isPinned);
      if (updatedUnpinnedNotes.length > 0) {
        const nextIndex = noteIndex < updatedUnpinnedNotes.length ? noteIndex : updatedUnpinnedNotes.length - 1;
        nextSelectedNote = updatedUnpinnedNotes[nextIndex];
      }
    }

    setSelectedNote(nextSelectedNote);
  };

  const handleTogglePin = (id: number) => { //메모고정
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, isPinned: !note.isPinned } : note
      )
    );
  };

  const handleUpdateNoteFolder = (id: number, folder: string) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === id ? { ...note, folder } : note
      )
    );
  };

  const handleDeleteFolder = (folderToDelete: string) => {
  if (folderToDelete === "전체") return; // '전체'는 삭제 금지

  setNotes((prevNotes) =>
    prevNotes.map((note) =>
      note.folder === folderToDelete ? { ...note, folder: "전체" } : note
    )
  );
};


  return (
    <div className={isDark ? "dark" : ""}>
      <div className="flex flex-col overflow-hidden h-screen ">
        <header className="fixed top-0 left-0 w-full bg-slate-100 border-b p-4 flex justify-between items-center h-14 z-50 select-none dark:bg-[#1e1e1e] dark:text-white">
          <h1 className="flex-1 text-lg font-semibold dark:text-[#d4d4d4]">memory storage</h1>
          <button onClick={() => setIsDark(!isDark)}>
            <img src="/dark.svg" className="w-6 h-6 dark:invert dark:brightness-75 transition"/>
          </button>
        </header>
        <div className="flex flex-1 pt-14">
          <Sidebar
            notes={notes}
            selectedId={selectedNote ? selectedNote.id : null}
            onSelectNote={(id) => setSelectedNote(notes.find((n) => n.id === id) || null)}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            isOpen={isOpen}//얘를 쓰는 이유와 밑에거랑 둘 다 쓰는이유..?
            setIsOpen={setIsOpen}
            onUpdateNoteFolder={handleUpdateNoteFolder}
            onDeleteFolder={handleDeleteFolder}
          />
          <Editor 
            selectedNote={selectedNote}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            isOpen={isOpen}
            onToggleSidebar={handleToggleSidebar}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
}
