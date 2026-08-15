import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBwI-HwGgihSZKUIyE4iymKueYxpEmlkzs",
  authDomain: "laesk-note.firebaseapp.com",
  projectId: "laesk-note",
  storageBucket: "laesk-note.firebasestorage.app",
  messagingSenderId: "783638243302",
  appId: "1:783638243302:web:065256c5261df095c21827"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM 요소 매핑
const views = {
    folders: document.getElementById('folders-view'),
    list: document.getElementById('note-list-view'),
    editor: document.getElementById('note-editor-view')
};

const btns = {
    back: document.getElementById('back-btn'),
    backText: document.getElementById('back-btn-text'),
    options: document.getElementById('options-btn'),
    done: document.getElementById('done-btn'),
    newFolder: document.getElementById('new-folder-btn'),
    newNote: document.getElementById('new-note-btn'),
    delNote: document.getElementById('delete-note-btn'),
    restoreNote: document.getElementById('restore-note-btn'),
    permDelNote: document.getElementById('perm-delete-note-btn')
};

const ui = {
    folderList: document.getElementById('folder-list'),
    noteList: document.getElementById('note-list'),
    textarea: document.getElementById('note-textarea'),
    noteCount: document.getElementById('note-count'),
    listTitle: document.getElementById('list-title'),
    footer: document.getElementById('main-footer'),
    normalToolbar: document.getElementById('normal-toolbar'),
    trashToolbar: document.getElementById('trash-toolbar')
};

// 상태 관리
let currentView = 'folders'; 
let currentFolderId = 'default'; 
let currentFolderName = '메모';
let currentNoteId = null;

let allNotes = [];
let allFolders = [];

// UI 업데이트 로직
function switchView(viewName) {
    currentView = viewName;
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');

    btns.back.classList.toggle('hidden', viewName === 'folders');
    btns.options.classList.toggle('hidden', viewName === 'editor');
    btns.done.classList.toggle('hidden', viewName !== 'editor');
    ui.footer.classList.toggle('hidden', viewName === 'editor');

    if (viewName === 'folders') {
        btns.newFolder.style.visibility = 'visible';
        btns.newNote.style.visibility = 'hidden';
        ui.noteCount.textContent = '';
        renderFolders();
    } else if (viewName === 'list') {
        btns.newFolder.style.visibility = 'hidden';
        btns.newNote.style.visibility = currentFolderId === 'trash' ? 'hidden' : 'visible';
        btns.backText.textContent = '폴더';
        ui.listTitle.textContent = currentFolderName;
        renderNotes();
    } else if (viewName === 'editor') {
        btns.backText.textContent = currentFolderName;
        const isTrash = (currentFolderId === 'trash');
        ui.normalToolbar.classList.toggle('hidden', isTrash);
        ui.trashToolbar.classList.toggle('hidden', !isTrash);
        ui.textarea.readOnly = isTrash;
    }
}

// 폴더 및 메모 렌더링
function renderFolders() {
    ui.folderList.innerHTML = '';
    
    // 1. 기본 폴더 (메모)
    const defaultNotesCount = allNotes.filter(n => !n.isDeleted && n.folderId === 'default').length;
    appendFolderToUI('default', '메모', 'fa-folder', 'var(--ios-yellow)', defaultNotesCount, false);

    // 2. 사용자가 추가한 커스텀 폴더
    allFolders.forEach(folder => {
        const count = allNotes.filter(n => !n.isDeleted && n.folderId === folder.id).length;
        appendFolderToUI(folder.id, folder.name, 'fa-folder', 'var(--ios-yellow)', count, true);
    });

    // 3. 휴지통
    const trashCount = allNotes.filter(n => n.isDeleted).length;
    appendFolderToUI('trash', '최근 삭제된 항목', 'fa-trash', 'var(--ios-gray)', trashCount, false);
}

function appendFolderToUI(id, name, iconClass, iconColor, count, isDeletable) {
    const li = document.createElement('li');
    li.className = 'note-item';
    li.innerHTML = `
        <div class="folder-item-content">
            <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
            <span class="note-title">${name}</span>
            <span class="folder-count">${count}</span>
        </div>
        ${isDeletable ? `<button class="folder-delete-btn"><i class="fas fa-minus-circle"></i></button>` : ''}
    `;

    li.querySelector('.folder-item-content').onclick = () => {
        currentFolderId = id;
        currentFolderName = name;
        switchView('list');
    };

    if (isDeletable) {
        li.querySelector('.folder-delete-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`'${name}' 폴더를 삭제하시겠습니까? (내부 메모는 모두 휴지통으로 이동합니다)`)) {
                // 폴더 내 메모 삭제(휴지통 이동) 처리
                const notesInFolder = allNotes.filter(n => n.folderId === id && !n.isDeleted);
                for (const note of notesInFolder) {
                    await updateDoc(doc(db, "notes", note.id), { isDeleted: true });
                }
                await deleteDoc(doc(db, "folders", id));
            }
        };
    }
    ui.folderList.appendChild(li);
}

function renderNotes() {
    ui.noteList.innerHTML = '';
    
    const filteredNotes = allNotes.filter(note => {
        if (currentFolderId === 'trash') return note.isDeleted;
        return !note.isDeleted && note.folderId === currentFolderId;
    });

    filteredNotes.forEach((data) => {
        const text = data.text || '';
        const lines = text.split('\n');
        const title = lines[0] || '새 메모';
        const preview = lines.length > 1 ? lines.slice(1).join(' ') : '추가 텍스트 없음';
        
        const date = data.updatedAt ? new Date(data.updatedAt.toDate()) : new Date();
        const dateString = `${date.getMonth() + 1}/${date.getDate()}`;

        const li = document.createElement('li');
        li.className = 'note-item';
        
        li.innerHTML = `
            <div class="note-content-wrapper" style="cursor:pointer;">
                <div class="note-title">${title}</div>
                <div class="note-preview">
                    <span>${dateString}</span>
                    <span>${preview}</span>
                </div>
            </div>
            <button class="list-delete-btn"><i class="fas fa-trash"></i></button>
        `;

        li.querySelector('.note-content-wrapper').onclick = () => {
            currentNoteId = data.id;
            ui.textarea.value = text;
            switchView('editor');
        };

        // 리스트에서 바로 메모 삭제
        li.querySelector('.list-delete-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm("메모를 삭제하시겠습니까?")) {
                if (currentFolderId === 'trash') {
                    await deleteDoc(doc(db, "notes", data.id));
                } else {
                    await updateDoc(doc(db, "notes", data.id), { isDeleted: true, updatedAt: new Date() });
                }
            }
        };
        ui.noteList.appendChild(li);
    });
    
    ui.noteCount.textContent = `${filteredNotes.length}개의 메모`;
}

// 데이터 동기화 (실시간)
onSnapshot(query(collection(db, "folders"), orderBy("createdAt", "asc")), (snapshot) => {
    allFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (currentView === 'folders') renderFolders();
});

onSnapshot(query(collection(db, "notes"), orderBy("updatedAt", "desc")), (snapshot) => {
    allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (currentView === 'folders') renderFolders();
    if (currentView === 'list') renderNotes();
});

// 메모 저장/삭제 관련 로직
async function saveCurrentNote() {
    if (currentFolderId === 'trash') return;
    
    const text = ui.textarea.value.trim();
    if (!text && !currentNoteId) return;

    if (currentNoteId) {
        await updateDoc(doc(db, "notes", currentNoteId), { text, updatedAt: new Date() });
    } else if (text) {
        await addDoc(collection(db, "notes"), {
            text,
            folderId: currentFolderId,
            isDeleted: false,
            updatedAt: new Date()
        });
    }
    currentNoteId = null;
}

// 이벤트 리스너 등록
btns.newFolder.addEventListener('click', async () => {
    const name = prompt("새로운 폴더 이름을 입력하세요:");
    if (name && name.trim()) {
        await addDoc(collection(db, "folders"), { name: name.trim(), createdAt: new Date() });
    }
});

btns.newNote.addEventListener('click', () => {
    if (currentFolderId === 'trash') return;
    currentNoteId = null;
    ui.textarea.value = '';
    switchView('editor');
});

btns.back.addEventListener('click', () => {
    if (currentView === 'editor') {
        saveCurrentNote();
        switchView('list');
    } else if (currentView === 'list') {
        switchView('folders');
    }
});

btns.done.addEventListener('click', () => {
    if (currentView === 'editor') {
        saveCurrentNote();
        switchView('list');
    }
});

// 에디터 툴바 버튼 - 삭제 관련
btns.delNote.addEventListener('click', async () => {
    if (currentNoteId && confirm("메모를 삭제하시겠습니까?")) {
        await updateDoc(doc(db, "notes", currentNoteId), { isDeleted: true, updatedAt: new Date() });
        currentNoteId = null;
        switchView('list');
    }
});

btns.restoreNote.addEventListener('click', async () => {
    if (currentNoteId) {
        await updateDoc(doc(db, "notes", currentNoteId), { isDeleted: false, updatedAt: new Date() });
        currentNoteId = null;
        switchView('list');
    }
});

btns.permDelNote.addEventListener('click', async () => {
    if (currentNoteId && confirm("메모를 영구적으로 삭제하시겠습니까?")) {
        await deleteDoc(doc(db, "notes", currentNoteId));
        currentNoteId = null;
        switchView('list');
    }
});

// 초기 실행
switchView('folders');