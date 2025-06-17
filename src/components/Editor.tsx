"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, BubbleMenu} from "@tiptap/react";
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';

import { createPortal } from 'react-dom';

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { Color } from '@tiptap/extension-color';
import Blockquote from '@tiptap/extension-blockquote';
import Text from '@tiptap/extension-text';
import TextStyle from '@tiptap/extension-text-style';

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isPinned: boolean;
}

interface EditorProps {
  selectedNote: Note | null;
  onAddNote: () => void;
  onUpdateNote: (id: number, newContent: string) => void;
  onDeleteNote: (id: number) => void;
  isOpen: boolean;
  onToggleSidebar:()=>void;
  isDark:boolean;
}


const useMediaQuery = (query: string) => { //반응형
  const [matches, setMatches] = useState<boolean>(false);

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


const formatDate = (dateString: string) => { //작성 날짜
  const date = new Date(dateString); 
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric" }).replace(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\./, "$1년 $2월 $3일");
};

export default function Editor({ selectedNote, onAddNote, onUpdateNote, onDeleteNote, isOpen, onToggleSidebar, isDark}: EditorProps) {
  const isMobile = useMediaQuery("(max-width: 700px)"); //사이드바가 메모장에 걸쳐짐
  const isSmallScreen = useMediaQuery("(max-width: 650px)");
  
  const toggleOptions = () => setShowOptions((prev) => !prev);

  const dropdownRef = useRef<HTMLDivElement>(null); //상단바 드롭다운
  const colorDropdownRef = useRef<HTMLDivElement>(null); //버블메뉴의 컬러 드롭다운
  const textDropdownRef = useRef<HTMLDivElement>(null); //버블메뉴의 사이즈 드롭다운
  const contextMenuRef = useRef<HTMLDivElement | null>(null); //표의 우클릭

  const [showDropdown, setShowDropdown] = useState(false); // 컬러 드롭다운 상태관리
  const [textDropdown, setTextDropdown] = useState(false); //사이즈 드롭다운 상태관리
  const [showOptions, setShowOptions] = useState(false); //상단바 드롭다운 상태관리
  
  const editorRef= useRef<HTMLDivElement|null>(null);
  const [isScrolled, setIsScrolled]=useState(false);

  const [selectedTextType, setSelectedTextType] = useState('텍스트'); //사이즈기본
  const [selectedTextColor, setSelectedTextColor] = useState<string>('#000000'); //컬러 기본
  const [selectedBgColor, setSelectedBgColor] = useState<string>('#ffffff'); //배경기본
  
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const editor = useEditor({ //에디터
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      Image,
      Text,
      TextStyle,
      Blockquote,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskItem.configure({nested: true}),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
        isAllowedUri: (url, ctx) => {
          try {
            // construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`)

            // use default validation
            if (!ctx.defaultValidate(parsedUrl.href)) {
              return false
            }

            // disallowed protocols
            const disallowedProtocols = ['ftp', 'file', 'mailto']
            const protocol = parsedUrl.protocol.replace(':', '')

            if (disallowedProtocols.includes(protocol)) {
              return false
            }

            // only allow protocols specified in ctx.protocols
            const allowedProtocols = ctx.protocols.map(p => (typeof p === 'string' ? p : p.scheme))

            if (!allowedProtocols.includes(protocol)) {
              return false
            }

            // disallowed domains
            const disallowedDomains = ['example-phishing.com', 'malicious-site.net']
            const domain = parsedUrl.hostname

            if (disallowedDomains.includes(domain)) {
              return false
            }

            // all checks have passed
            return true
          } catch {
            return false
          }
        },
        shouldAutoLink: url => {
          try {
            // construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`)

            // only auto-link if the domain is not in the disallowed list
            const disallowedDomains = ['example-no-autolink.com', 'another-no-autolink.com']
            const domain = parsedUrl.hostname

            return !disallowedDomains.includes(domain)
          } catch {
            return false
          }
        },

      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: selectedNote?.content || "",
    onUpdate: ({ editor }) => {
      if (!selectedNote) return;
      
      const newContent = editor.getHTML();

      if (newContent !== selectedNote.content) { // 변경된 경우에만 업데이트
        onUpdateNote(selectedNote.id, newContent);
      }
    },
    editorProps: {
      handlePaste(view, event) { 
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData("text/plain");
        const items = clipboardData.items;

        // 1️⃣ 이미지 파일 붙여넣기
        for (const item of items) { 
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              const formData = new FormData();
              formData.append("file", file);
              
              fetch("/api/upload",{
                method:"POST",
                body:formData,
              })
                .then((res)=>res.json())
                .then((data)=>{
                  if(data.url){
                    const { schema, tr } = view.state;
                    const node = schema.nodes.image.create({ src: data.url });
                    view.dispatch(tr.replaceSelectionWith(node));
                  }
                })
                .catch((err)=>console.error("이미지 업로드 실패:",err));
              return true;
            }
          }
        }
  
        // 2️⃣ URL 붙여넣기 (자동 링크 생성)
        const urlPattern = /^(https?:\/\/[^\s]+)/;
        if (urlPattern.test(text)) {
          const linkHTML = `<a href="${text}" target="_blank" rel="noopener noreferrer"">${text}</a>`;
          editor?.commands.insertContent(linkHTML);

          return true;
        }

        return false;
      },
    },
  });


  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    try {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message)
      } else {
        alert('알 수 없는 에러가 발생했습니다.')
      }
    }
  }, [editor])



  const handleSelectOption = (option: string) => { //옵션 동작
    if (editor){
      if(option==="• 구분점 표시 목록"){
        editor.chain().focus().toggleBulletList().run();
      }
      else if(option==="✓ 체크 표시 목록"){
        editor.chain().focus().toggleTaskList().run();
      }
      else if(option==="1. 번호가 매겨진 목록"){
        editor.chain().focus().toggleOrderedList().run();
      }
      else if(option==="B"){
        editor.chain().focus().toggleBold().run();
      }
      else if(option==="I"){
        editor.chain().focus().toggleItalic().run();
      }
      else if(option==="U"){
        editor.chain().focus().toggleUnderline().run();
      }
      else if(option==="S"){
        editor.chain().focus().toggleStrike().run();
      }
    }
    setShowOptions(false); // 선택 후 닫기
  };  


  const textColors = [
    { color: 'black', value: '#37352f', border: '#37352f', darkValue: '#d6d6d6', darkBorder: '#3a3a3a' },
    { color: 'gray', value: '#787774', border: '#787774', darkValue: '#9b9b9b', darkBorder: '#3a3a3a' },
    { color: 'brown', value: '#9f6b53', border: '#9f6b53', darkValue: '#ba856f', darkBorder: '#4a352d' },
    { color: 'orange', value: '#d9730d', border: '#d9730d', darkValue: '#c77d48', darkBorder: '#4d3725' },
    { color: 'yellow', value: '#cb912f', border: '#cb912f', darkValue: '#ca984d', darkBorder: '#42382a' },
    { color: 'green', value: '#448361', border: '#448361', darkValue: '#529e72', darkBorder: '#273d32' },
    { color: 'blue', value: '#337ea9', border: '#337ea9', darkValue: '#379ad3', darkBorder: '#283740' },
    { color: 'purple', value: '#9065b0', border: '#9065b0', darkValue: '#9d68d3', darkBorder: '#3a2f44' },
    { color: 'pink', value: '#c14c8a', border: '#c14c8a', darkValue: '#d15796', darkBorder: '#4d2e3d' },
    { color: 'red', value: '#d44c47', border: '#d44c47', darkValue: '#e65b58', darkBorder: '#543131' },
  ]
  
  const backgroundColors = [
    { color: 'white', value: '#ffffff', border: '#787774', darkValue: '#252525', darkBorder: '#3a3a3a' },
    { color: 'gray', value: '#f8f8f7', border: '#787774', darkValue: '#2f2f2f', darkBorder: '#434343' },
    { color: 'brown', value: '#f4eeee', border: '#9f6b53', darkValue: '#4a3228', darkBorder: '#653e2f' },
    { color: 'orange', value: '#fbecdd', border: '#d9730d', darkValue: '#5c3b23', darkBorder: '#794823' },
    { color: 'yellow', value: '#fbf3db', border: '#cb912f', darkValue: '#564328', darkBorder: '#69502c' },
    { color: 'green', value: '#edf3ec', border: '#448361', darkValue: '#243d30', darkBorder: '#26503a' },
    { color: 'blue', value: '#e7f3f8', border: '#337ea9', darkValue: '#143a4e', darkBorder: '#1a4760' },
    { color: 'purple', value: '#f8f3fc', border: '#9065b0', darkValue: '#3c2d49', darkBorder: '#4d3662' },
    { color: 'pink', value: '#fcf1f6', border: '#c14c8a', darkValue: '#4e2c3c', darkBorder: '#6d334f' },
    { color: 'red', value: '#fdebec', border: '#d44c47', darkValue: '#522e2a', darkBorder: '#753734' },
  ]


  useEffect(() => {
    const el = editorRef.current;
    if (!el) {
      console.log('❌ editorRef.current is null');
      return;
    }
  
    const handleContextMenu = (e: MouseEvent) => {
      console.log('✅ 우클릭 감지됨:', e.target);
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    };
  
    el.addEventListener('contextmenu', handleContextMenu);
  
    return () => {
      el.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor]);
  


  useEffect(() => { //스크롤 이벤트
    const handleScroll = () => {
      if (editorRef.current) {
        setIsScrolled(editorRef.current.scrollTop > 0);
      }
    };
  
    if (!editorRef.current) return;
  
    editorRef.current.addEventListener("scroll", handleScroll);
  
    return () => {
      editorRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, [editor]);


  /*useEffect(() => {
    if (!editor) return;
  
    const handleUpdate = () => {
      const { state } = editor;
      const { selection } = state;
      const currentNode = selection.$head.parent; // 현재 커서 위치의 노드
  
      // 현재 블록이 구분점 목록 또는 번호 목록인지 확인
      const isBulletList = editor.isActive("bulletList");
      const isOrderedList = editor.isActive("orderedList");
  
      if ((isBulletList || isOrderedList) && currentNode.textContent === "") {
        setSelectedOption("본문"); // 목록이 비어 있으면 본문으로 변경
      }
    };
  
    editor.on("update", handleUpdate); // 내용 업데이트 시 감지
  
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);*/


  /*useEffect(() => { //버블메뉴가 닫히면 드롭메뉴도 닫힘
    if (!isBubbleMenuVisible && showDropdown) {
      setShowDropdown(false)
    }
  }, [isBubbleMenuVisible, showDropdown]);

  useEffect(() => {
    if (!isBubbleMenuVisible && showDropdown) {
      // editor에 focus가 살아있는 경우에는 닫지 않음
      const isEditorFocused = editor?.isFocused ?? false
      if (!isEditorFocused) {
        setShowDropdown(false)
      }
    }
  }, [isBubbleMenuVisible, showDropdown, editor])*/
  

  useEffect(() => { //텍스트 유형에 맞게 버블메뉴 텍스트 변경
    if (!editor) return
  
    const handleSelectionChange = () => {
      const isHeading1 = editor.isActive('heading', { level: 2 })
      const isHeading2 = editor.isActive('heading', { level: 3 })
      const isParagraph = editor.isActive('paragraph')
  
      if (isHeading1) {
        setSelectedTextType('제목1')
      } else if (isHeading2) {
        setSelectedTextType('제목2')
      } else if (isParagraph) {
        setSelectedTextType('텍스트')
      } else {
        setSelectedTextType('텍스트') // fallback
      }
    }
  
    editor.on('selectionUpdate', handleSelectionChange)
  
    return () => {
      editor.off('selectionUpdate', handleSelectionChange)
    }
  }, [editor])


  useEffect(() => { //색상 선택 
    if (!editor) return

    const updateColors = () => {
      const state: EditorState = editor.state
      const { from, to } = state.selection

      let color: string | null = null
      let highlight: string | null = null

      state.doc.nodesBetween(from, to, (node: ProseMirrorNode) => {
        if (node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'textStyle' && mark.attrs.color) {
              color = mark.attrs.color
            }
            if (mark.type.name === 'highlight' && mark.attrs.color) {
              highlight = mark.attrs.color
            }
          })
        }
      })

      setSelectedTextColor(color || '')
      setSelectedBgColor(highlight || '')
    }

    editor.on('selectionUpdate', updateColors)

    return () => {
      editor.off('selectionUpdate', updateColors)
    }
  }, [editor])

  
  useEffect(() => { //새 메모 생성 시 or 다른 메모 선택 시 실행
    if (editor && selectedNote) {
      if (editor.getHTML() !== selectedNote.content) { // 현재 내용과 다를 때만 업데이트
        editor.commands.setContent(selectedNote.content);

        if (selectedNote.content.trim()==="") {
          editor.commands.focus(); // 새 메모 생성 시 포커스 유지
        } else {
          editor.commands.blur(); // 다른 메모 선택 시 커서 블러처리
        }
      }
    }
  }, [selectedNote]);

  
  useEffect(() => { //바깥을 클릭하면 닫히도록
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editor]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // context menu가 열려있고, 클릭된 타겟이 context 메뉴 내부가 아닐 경우 닫기
      if (contextMenuRef.current  && !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenuPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editor]);
  
 
  if (!editor) {
    return null
  }


  if (!selectedNote) { //아무 메모도 선택되지 않았을 때
    return (
      <>
        {(isMobile || isSmallScreen) ? (
          // 작은 화면 : 가운데 정렬
          <div className="w-full h-screen flex items-center justify-center text-gray-400 dark:bg-[#1a1a1a] px-4">
            <div className="flex flex-col items-center">
              <p className="mb-4">메모가 없습니다.</p>
              <button
                onClick={onAddNote}
                className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition"
              >
                <img src="/add.svg" className="w-5 h-5" alt="메모 추가" />
              </button>
            </div>
          </div>
        ) : (
          // 큰 화면: 상단 좌측 정렬
          <div className="flex-1 p-4 text-gray-400 dark:bg-[#1a1a1a]">
            메모를 선택해주세요.
          </div>
        )}
      </>
    )
  }
  

  return (
    <div className="relative flex-1 bg-white h-[calc(100vh-56px)] flex flex-col dark:bg-[#1a1a1a] overflow-hidden">
      
      {/*에디터 상단바*/}
      <div className={`flex h-6 p-7 flex items-center justify-center transition-all ${isScrolled ? "border-b border-gray-300" : ""}`}>
        
        {/*사이드바 열기 & 메모삭제*/}
        <div className="absolute left-4 flex items-center gap-x-4 transition-all duration-300 easy-in-out">
          {((!isOpen && !isMobile && !isSmallScreen) || isMobile || isSmallScreen)&&(
            <button onClick={onToggleSidebar} className="w-6 h-6 flex items-center">
              <img src="/chevron_right.svg" alt="열기" className="w-6 h-6 dark:brightness-75"/>
            </button>
          )}

          <button onClick={() => onDeleteNote(selectedNote.id)} className="w-6 h-6 flex items-center" >
            <img src="/delete.svg" className="dark:brightness-75" alt="삭제" />
          </button>
        </div>
        
        {/* 상단바 가운데 */}
        <div className="relative gap-1" ref={dropdownRef}>
          <button onClick={toggleOptions} className={`px-2 py-1 text-sm rounded-lg ${showOptions ? "bg-amber-100 dark:bg-[#4f4f4f]" : ""}`}>
            <img src="/list.svg" className="dark:brightness-75" alt="Aa" />
          </button>
          
          <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="px-2 py-1 text-sm">
            <img src="/divider.svg" className="dark:brightness-75" alt="구분선" />
          </button>
          
          <button 
            onClick={() => {
              if (!editor) return
              editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}} 
            className="px-2 py-1 text-sm">
            <img src="/table.svg" className="dark:brightness-75" alt="표 삽입" />
          </button>

          {showOptions && (
            <div className="absolute left-[-55px] top-full mt-2 w-50 bg-white shadow-md border rounded-lg p-1 z-50 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-[#d4d4d4]">
              {/* 목록 스타일 */}
              {[
                { label: "• 구분점 표시 목록",  command:"bulletList" },
                { label: "1. 번호가 매겨진 목록", command:"orderedList" },
                { label: "✓ 체크 표시 목록", command:"checktList" },
               ].map(({label, command}) => (
                <button
                  key={label}
                  onClick={() => handleSelectOption(label)}
                  className={`flex items-center w-full text-left p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg ${
                    editor?.isActive(command)}`}
                >
                  <span className="text-[13.5px]">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute right-4 flex items-center gap-x-4 transition-all duration-300 easy-in-out">
          <button onClick={onAddNote} className="w-6 h-6 flex items-center" >
            <img src="/new.svg" className="dark:brightness-75" alt="삭제" />
          </button>
        </div>
      </div>
      
      <div ref={editorRef} className="w-full flex-1 overflow-auto break-words text-neutral-600 whitespace-pre-wrap px-7 pt-4 focus:outline-none scrollbar-hide" style={{ outline: "none", border: "none" }}>
        {selectedNote && editor&& (
          <>
            <BubbleMenu 
              editor={editor} 
              tippyOptions={{ 
                duration: 100,
                onHide: () => {
                  setShowDropdown(false);
                }
              }}
              shouldShow={({ editor, from, to }) => {
                return from !== to && editor.isEditable
              }}
            >
              <div className="flex bg-white border border-gray-200 rounded-lg shadow-sm p-1 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-[#d4d4d4]">
                {/* 텍스트 */}
                <div className="relative" ref={textDropdownRef}>
                  <button
                    onClick={() => setTextDropdown(!textDropdown)}
                    className={`p-1 rounded-sm bg-transparent hover:bg-gray-200 hover:rounded-lg dark:hover:bg-[#333]  ${
                      editor.isActive('paragraph')}`}
                  >
                    <div className="flex items-center">
                      <div className="flex h-6 items-center px-1 justify-center rounded-md text-[13.5px] font-semibold">
                        {selectedTextType}
                      </div>
                      <img src="/arrow_down.svg" className="w-4 h-4" alt="텍스트 색상" />
                    </div>
                  </button>
                  {textDropdown && (
                    <div className="absolute top-full left-0 mt-1 flex flex-col gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-md z-50 w-40 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-[#d4d4d4]">
                      <button
                        onClick={() => {
                          editor.chain().focus().setParagraph().run();
                          setSelectedTextType('텍스트');
                          setTextDropdown(false);
                          editor.commands.blur();
                        }} 
                        className={"hover:bg-gray-100 h-6 hover:rounded-md dark:hover:bg-[#333]"}
                      >
                        <div className="flex items-center">
                          <img src="/paragraph.svg" className="w-8 h-5 dark:brightness-50" alt="본문" />
                          <span className="text-[13.5px]">텍스트</span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          editor.chain().focus().toggleHeading({ level: 2 }).run();
                          setSelectedTextType('제목1');
                          setTextDropdown(false);
                          editor.commands.blur();
                        }} 
                          className={"hover:bg-gray-100 h-6 hover:rounded-md dark:hover:bg-[#333]"}
                      >
                        <div className="flex items-center">
                          <img src="/h1.svg" className="w-8 h-6 dark:brightness-50" alt="제목1" />
                          <span className="text-[13.5px]">제목1</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          editor.chain().focus().toggleHeading({ level: 3 }).run();
                          setSelectedTextType('제목2');
                          setTextDropdown(false);
                          editor.commands.blur();
                        }} 
                          className={"hover:bg-gray-100 h-6 hover:rounded-md dark:hover:bg-[#333]"}
                      >
                        <div className="flex items-center">
                          <img src="/h2.svg" className="w-8 h-6 dark:brightness-50" alt="제목2" />
                          <span className="text-[13.5px]">제목2</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* BIUS */}
                {[
                  { label: "B", className: "font-bold", command:"bold"}, 
                  { label: "I", className: "italic", command:"italic" }, 
                  { label: "U", className: "underline", command:"underline" }, 
                  { label: "S", className: "line-through", command:"strike" },
                ].map(({ label, className, command }) => (
                  <button
                    key={label}
                    onClick={() => {handleSelectOption(label)}}
                    className={`p-1 rounded-sm bg-transparent hover:bg-gray-200 hover:rounded-lg dark:hover:bg-[#333] ${className} ${
                      editor.isActive(command) ? 'is-active' : 'hover:bg-gray-200 hover:rounded-lg'}`}
                  >
                    <div className="w-6 h-6 flex items-center justify-center rounded-md text-[15px]">
                      {label}
                    </div>
                    
                  </button>
                ))}
                
                {/* 링크연결 */}
                <button
                  onClick={setLink} className={editor.isActive('link') ? 'is-active' : 'hover:bg-gray-200 hover:rounded-lg dark:hover:bg-[#333]'}
                >
                  <img src="/add_link.svg" className="w-8 h-4 dark:brightness-200" alt="링크연결" />
                </button>

                {/* 인용 */}
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()} 
                  className={editor.isActive('blockquote') ? 'is-active hover:bg-gray-200 hover:rounded-lg' : 'hover:bg-gray-200 hover:rounded-lg dark:hover:bg-[#333]'}
                >
                  <img src="/quote.svg" className="w-8 h-5 dark:brightness-200" alt="링크연결" />
                </button>
                
                {/*색상 변경*/}
                <div className="relative" ref={colorDropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`p-1 rounded-sm bg-transparent hover:bg-gray-200 hover:rounded-lg dark:hover:bg-[#333] ${
                      editor.isActive('textStyle')
                    }`}
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-6 h-6 flex items-center justify-center rounded-md text-[15px] font-semibold border box-border dark:border-gray-600"
                        style={{ color: selectedTextColor, backgroundColor:selectedBgColor }}
                      >
                        A
                      </div>
                      <img src="/arrow_down.svg" className="w-4 h-4" alt="텍스트 색상" />
                    </div>
                  </button>

                  {showDropdown && (
                    <div className="absolute top-full left-0 mt-1 flex flex-col gap-2 bg-white border border-gray-200 rounded-lg p-3 shadow-md z-50 w-40 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-[#d4d4d4]">
                      {/* 텍스트 */}
                      <div>
                        <div className="text-xs text-gray-500 mb-2">텍스트 색상</div>
                        <div className="grid grid-cols-5 gap-2">
                          {textColors.map((c) => (
                            <button
                              key={isDark ? c.darkValue : c.value}
                              className={`
                                w-6 h-6 flex items-center justify-center rounded-md 
                                text-[15px] font-semibold border box-border 
                                ${selectedTextColor === (isDark ? c.darkValue : c.value) ? 'border-2 border-black' : isDark ? c.darkBorder : c.border}
                              `}
                              style={{
                                borderColor: selectedTextColor === (isDark ? c.darkValue : c.value) ? 'black' : (isDark ? c.darkBorder : c.border) + '33',
                                color: isDark ? c.darkValue : c.value,
                              }}
                              onClick={() => {
                                editor.chain().focus().setColor(isDark ? c.darkValue : c.value).run()
                                setSelectedTextColor(isDark ? c.darkValue : c.value)}}
                            >
                              A
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 배경 */}
                      <div>
                        <div className="text-xs text-gray-500 mt-2 mb-2">배경 색상</div>
                        <div className="grid grid-cols-5 gap-2">
                          {backgroundColors.map((c) => (
                            <button
                              key={isDark ? c.darkValue : c.value}
                              className={`
                                w-6 h-6 rounded-md border box-border 
                                ${selectedBgColor === (isDark ? c.darkValue : c.value) ? 'border-2 border-black' : isDark ? c.darkBorder : c.border}
                              `}
                              style={{
                                borderColor: selectedBgColor === (isDark ? c.darkValue : c.value) ? 'black' : (isDark ? c.darkBorder : c.border)+'33',
                                backgroundColor: isDark ? c.darkValue : c.value,
                              }}
                              onClick={() => {
                                editor.chain().focus().setHighlight({ color: isDark ? c.darkValue : c.value }).run()
                                setSelectedBgColor(isDark ? c.darkValue : c.value)}}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </BubbleMenu>
            
            <div className="flex items-center justify-center">
              <p className="text-[13px] text-neutral-400 font-normal whitespace-nowrap dark:text-gray-500">{formatDate(selectedNote.createdAt)}</p>
            </div>
            
            <EditorContent editor={editor} spellCheck={false} className="mt-4 dark:text-[#d4d4d4]"/> 
          </>
        )}
      </div>
      {contextMenuPos &&
        createPortal(
          <div 
            ref={contextMenuRef}
            className="absolute z-50 p-1 bg-white border border-gray-200 rounded-xl shadow-lg text-sm font-normal w-4 min-w-[160px] overflow-hidden"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            onClick={() => setContextMenuPos(null)}
          >
            {[
              { label: "앞에 열 추가", action: () => editor.chain().focus().addColumnBefore().run() },
              { label: "뒤에 열 추가", action: () => editor.chain().focus().addColumnAfter().run() },
              { label: "열 삭제", action: () => editor.chain().focus().deleteColumn().run() },
              { label: "앞에 행 추가", action: () => editor.chain().focus().addRowBefore().run() },
              { label: "뒤에 행 추가", action: () => editor.chain().focus().addRowAfter().run() },
              { label: "행 삭제", action: () => editor.chain().focus().deleteRow().run() },
              { label: "표 삭제", action: () => editor.chain().focus().deleteTable().run() },
              { label: "셀 합병", action: () => editor.chain().focus().mergeCells().run() },
              { label: "셀 나눔", action: () => editor.chain().focus().splitCell().run() },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="w-full text-left px-4 py-2 hover:bg-gray-200 hover:rounded-xl transition-colors duration-150"
              >
                {item.label}
              </button>
            ))}
          </div>
          ,
          document.body
        )}
    </div>
  );
}
