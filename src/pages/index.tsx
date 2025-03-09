import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isOpen, setIsOpen]=useState<boolean>(false);

  const handleToggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const handleAddNote = () => {
    const newNote: Note = { id: Date.now(), title: "새 메모", content: "", isPinned: false, createdAt: new Date().toISOString() };
    setNotes([newNote, ...notes]);
  };

  const handleUpdateNote = (id: number, newContent: string) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, content: newContent } : note)));
    if (selectedNote) setSelectedNote({ ...selectedNote, content: newContent });
  };

  const handleDeleteNote = (id: number) => {
    const updatedNotes=notes.filter((note)=>note.id!==id);

    if(updatedNotes.length===0){
      setSelectedNote(null);
    }
    else{
      const currentIndex =notes.findIndex((note)=>note.id===id);
      const nextNode=updatedNotes[currentIndex]||updatedNotes[currentIndex-1]||updatedNotes[0];
    }
    setNotes(updatedNotes);
    //setNotes(notes.filter((note) => note.id !== id));
  };

  const handleTogglePin = (id: number) => {
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, isPinned: !note.isPinned } : note
      )
    );
  };

  return (
    <div className="flex flex-col overflow-hidden h-screen">
      <header className="fixed top-0 left-0 w-full bg-slate-100 border-b p-4 flex justify-between items-center h-14 z-50">
        <h1 className="flex-1 text-lg font-semibold">🍎 memory storage</h1>
        <button className="p-2 bg-gray-200 rounded-full">👤</button>
      </header>
      <div className="flex flex-1 pt-14">
        <Sidebar
          notes={notes}
          onSelectNote={(id) => setSelectedNote(notes.find((n) => n.id === id) || null)}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onTogglePin={handleTogglePin}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
        <Editor 
          selectedNote={selectedNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          isSidebarOpen={isOpen}
          onToggleSidebar={handleToggleSidebar}
        />
      </div>
      
    </div>
  );
}
