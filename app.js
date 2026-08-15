import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBwI-HwGgihSZKUIyE4iymKueYxpEmlkzs",
  authDomain: "laesk-note.firebaseapp.com",
  projectId: "laesk-note",
  storageBucket: "laesk-note.firebasestorage.app",
  messagingSenderId: "783638243302",
  appId: "1:783638243302:web:065256c5261df095c21827",
  measurementId: "G-1PYT9SDZ0Q"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// DOM Elements
const foldersView = document.getElementById('folders-view');
const listView = document.getElementById('note-list-view');
const editorView = document.getElementById('note-editor-view');
const listFooter = document.getElementById('list-footer');

const backBtn = document.getElementById('back-btn');
const backBtnText = document.getElementById('back-btn-text');
const optionsBtn = document.getElementById('options-btn');
const doneBtn = document.getElementById('done-btn');
const newNoteBtn = document.getElementById('new-note-btn');

const noteList = document.getElementById('note-list');
const noteTextarea = document.getElementById('note-textarea');
const noteCount = document.getElementById('note-count');
const listTitle = document.getElementById('list-title');

const folderNotesBtn = document.getElementById('folder-notes');
const folderTrashBtn = document.getElementById('folder-trash');
const countNotes = document.getElementById('count-notes');
const countTrash = document.getElementById('count-trash');

const normalToolbar = document.getElementById('normal-toolbar');
const trashToolbar = document.getElementById('trash-toolbar');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const restoreNoteBtn = document.getElementById('restore-note-btn');
const permDeleteNoteBtn = document.getElementById('perm-delete-note-btn');

// State
let currentView = 'folders'; // 'folders', 'list', 'editor'
let currentFolder = 'notes'; // 'notes', 'trash'
let currentNoteId = null;
let allNotesData = [];

function updateUI() {
    foldersView.classList.add('hidden');
    listView.classList.add('hidden');
    editorView.classList.add('hidden');
    listFooter.classList.add('hidden');
    backBtn.classList.add('hidden');
    optionsBtn.classList.add('hidden');
    doneBtn.classList.add('hidden');

    if (currentView === 'folders') {
        foldersView.classList.remove('hidden');
        optionsBtn.classList.remove('hidden');
    } 
    else if (currentView === 'list') {
        listView.classList.remove('hidden');
        listFooter.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        backBtnText.textContent = '폴더';
        optionsBtn.classList.remove('hidden');
        
        listTitle.textContent = currentFolder === 'notes' ? '메모' : '최근 삭제된 항목';
        newNoteBtn.style.visibility = currentFolder === 'notes' ? 'visible' : 'hidden';
        
        renderNotes();
    } 
    else if (currentView === 'editor') {
        editorView.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        backBtnText.textContent = currentFolder === 'notes' ? '메모' : '휴지통';
        doneBtn.classList.remove('hidden');
        
        if (currentFolder === 'notes') {
            normalToolbar.classList.remove('hidden');
            trashToolbar.classList.add('hidden');
            noteTextarea.readOnly = false;
        } else {
            normalToolbar.classList.add('hidden');
            trashToolbar.classList.remove('hidden');
            noteTextarea.readOnly = true;
        }
    }
}

function renderNotes() {
    noteList.innerHTML = '';
    let count = 0;
    
    const filteredNotes = allNotesData.filter(note => {
        if (currentFolder === 'notes') return !note.isDeleted;
        if (currentFolder === 'trash') return note.isDeleted;
        return false;
    });

    filteredNotes.forEach((data) => {
        count++;
        const text = data.text || '';
        const lines = text.split('\n');
        const title = lines[0] || '새 메모';
        const preview = lines.length > 1 ? lines.slice(1).join(' ') : '추가 텍스트 없음';
        
        const date = data.updatedAt ? new Date(data.updatedAt.toDate()) : new Date();
        const dateString = `${date.getMonth() + 1}/${date.getDate()}`;

        const li = document.createElement('li');
        li.className = 'note-item';
        li.innerHTML = `
            <div class="note-title">${title}</div>
            <div class="note-preview">
                <span>${dateString}</span>
                <span>${preview}</span>
            </div>
        `;
        li.onclick = () => {
            currentNoteId = data.id;
            noteTextarea.value = text;
            currentView = 'editor';
            updateUI();
        };
        noteList.appendChild(li);
    });
    
    noteCount.textContent = `${count}개의 메모`;
}

function loadNotes() {
    const q = query(collection(db, "notes"), orderBy("updatedAt", "desc"));
    onSnapshot(q, (snapshot) => {
        allNotesData = [];
        let activeCount = 0;
        let trashCount = 0;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allNotesData.push(data);
            
            if (data.isDeleted) {
                trashCount++;
            } else {
                activeCount++;
            }
        });

        countNotes.textContent = activeCount;
        countTrash.textContent = trashCount;

        if (currentView === 'list') {
            renderNotes();
        }
    });
}

async function saveCurrentNote() {
    if (currentFolder === 'trash') return;
    
    const text = noteTextarea.value.trim();
    if (!text && !currentNoteId) {
        return;
    }

    if (currentNoteId) {
        const noteRef = doc(db, "notes", currentNoteId);
        await updateDoc(noteRef, {
            text: text,
            updatedAt: new Date()
        });
    } else if (text) {
        await addDoc(collection(db, "notes"), {
            text: text,
            updatedAt: new Date(),
            isDeleted: false
        });
    }
}

async function moveToTrash() {
    if (currentNoteId) {
        const noteRef = doc(db, "notes", currentNoteId);
        await updateDoc(noteRef, {
            isDeleted: true,
            updatedAt: new Date()
        });
    }
    currentNoteId = null;
    currentView = 'list';
    updateUI();
}

async function restoreNote() {
    if (currentNoteId) {
        const noteRef = doc(db, "notes", currentNoteId);
        await updateDoc(noteRef, {
            isDeleted: false,
            updatedAt: new Date()
        });
    }
    currentNoteId = null;
    currentView = 'list';
    updateUI();
}

async function permanentlyDelete() {
    if (currentNoteId) {
        const noteRef = doc(db, "notes", currentNoteId);
        await deleteDoc(noteRef);
    }
    currentNoteId = null;
    currentView = 'list';
    updateUI();
}

// Event Listeners
folderNotesBtn.addEventListener('click', () => {
    currentFolder = 'notes';
    currentView = 'list';
    updateUI();
});

folderTrashBtn.addEventListener('click', () => {
    currentFolder = 'trash';
    currentView = 'list';
    updateUI();
});

newNoteBtn.addEventListener('click', () => {
    if (currentFolder === 'trash') return;
    currentNoteId = null;
    noteTextarea.value = '';
    currentView = 'editor';
    updateUI();
});

backBtn.addEventListener('click', () => {
    if (currentView === 'editor') {
        saveCurrentNote();
        currentView = 'list';
        updateUI();
    } else if (currentView === 'list') {
        currentView = 'folders';
        updateUI();
    }
});

doneBtn.addEventListener('click', () => {
    if (currentView === 'editor') {
        saveCurrentNote();
        currentView = 'list';
        updateUI();
    }
});

deleteNoteBtn.addEventListener('click', moveToTrash);
restoreNoteBtn.addEventListener('click', restoreNote);
permDeleteNoteBtn.addEventListener('click', permanentlyDelete);

// Init
updateUI();
loadNotes();