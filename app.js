import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const listView = document.getElementById('note-list-view');
const editorView = document.getElementById('note-editor-view');
const listFooter = document.getElementById('list-footer');

const backBtn = document.getElementById('back-btn');
const backBtnText = backBtn.querySelector('span');
const optionsBtn = document.getElementById('options-btn');
const doneBtn = document.getElementById('done-btn');
const newNoteBtn = document.getElementById('new-note-btn');

const noteList = document.getElementById('note-list');
const noteTextarea = document.getElementById('note-textarea');
const noteCount = document.getElementById('note-count');

let currentNoteId = null;

function showEditor() {
    listView.classList.add('hidden');
    listFooter.classList.add('hidden');
    editorView.classList.remove('hidden');
    
    backBtnText.textContent = '메모';
    optionsBtn.classList.add('hidden');
    doneBtn.classList.remove('hidden');
    
    noteTextarea.focus();
}

function showList() {
    editorView.classList.add('hidden');
    listView.classList.remove('hidden');
    listFooter.classList.remove('hidden');
    
    backBtnText.textContent = '폴더';
    doneBtn.classList.add('hidden');
    optionsBtn.classList.remove('hidden');
}

function loadNotes() {
    const q = query(collection(db, "notes"), orderBy("updatedAt", "desc"));
    onSnapshot(q, (snapshot) => {
        noteList.innerHTML = '';
        let count = 0;
        snapshot.forEach((docSnap) => {
            count++;
            const data = docSnap.data();
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
            li.onclick = () => openNote(docSnap.id, text);
            noteList.appendChild(li);
        });
        noteCount.textContent = `${count}개의 메모`;
    });
}

async function saveCurrentNote() {
    const text = noteTextarea.value.trim();
    if (!text) {
        showList();
        return;
    }

    if (currentNoteId) {
        const noteRef = doc(db, "notes", currentNoteId);
        await updateDoc(noteRef, {
            text: text,
            updatedAt: new Date()
        });
    } else {
        await addDoc(collection(db, "notes"), {
            text: text,
            updatedAt: new Date()
        });
    }
    currentNoteId = null;
    showList();
}

function openNote(id, text) {
    currentNoteId = id;
    noteTextarea.value = text;
    showEditor();
}

newNoteBtn.addEventListener('click', () => {
    currentNoteId = null;
    noteTextarea.value = '';
    showEditor();
});

backBtn.addEventListener('click', () => {
    if (!editorView.classList.contains('hidden')) {
        saveCurrentNote();
    }
});

doneBtn.addEventListener('click', () => {
    saveCurrentNote();
});

loadNotes();