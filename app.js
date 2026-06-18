import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    deleteDoc, 
    writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCl8OZPgVg5eUwfOmgOzgSY61kp6Tz-f3M",
    authDomain: "housingsocietyapp-edbcb.firebaseapp.com",
    databaseURL: "https://housingsocietyapp-edbcb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "housingsocietyapp-edbcb",
    storageBucket: "housingsocietyapp-edbcb.firebasestorage.app",
    messagingSenderId: "1044547229709",
    appId: "1:1044547229709:web:4d361eb54a21d298259d44"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const tableBody = document.querySelector('#usersTable tbody');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const statusMessage = document.getElementById('statusMessage');

// Bulk Upload DOM Elements
const jsonFileInput = document.getElementById('jsonFileInput');
const uploadTriggerBtn = document.getElementById('uploadTriggerBtn');
const bulkUploadBtn = document.getElementById('bulkUploadBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');

let parsedJsonData = null; // Holds the structured records globally once loaded

// 1. Initial Data Load
async function fetchAndRenderTable() {
    try {
        const querySnapshot = await getDocs(collection(db, "Income"));
        tableBody.innerHTML = ""; 
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center">No records found.</td></tr>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${docSnap.id}</td>
                <td>${data.RoomNo || 'N/A'}</td>
                <td>${data.TrnDate || 'N/A'}</td>
				<td>${data.PaymentMode || 'N/A'}</td>
				<td>${data.ReferenceNumber || 'N/A'}</td>
				<td>${data.Amount || 'N/A'}</td>
				<td>${data.Comments || 'N/A'}</td>
				<td>${data.CreatedDate || 'N/A'}</td>
                <td><button class="btn-sm-danger" data-id="${docSnap.id}">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });

        attachRowDeleteListeners();
    } catch (error) {
        showMessage("Failed to load Income data.", "error");
    }
}

function attachRowDeleteListeners() {
    document.querySelectorAll('.btn-sm-danger').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.getAttribute('data-id');
            if (confirm(`Delete document: ${docId}?`)) {
                await deleteDoc(doc(db, "Income", docId));
                showMessage("Document deleted.", "success");
                fetchAndRenderTable();
            }
        });
    });
}

// 2. Handling Local File Selection
uploadTriggerBtn.addEventListener('click', () => jsonFileInput.click());

jsonFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileNameDisplay.innerText = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target.result);
            
            // Basic verification to make sure it's an array of items
            if (Array.isArray(parsed)) {
                parsedJsonData = parsed;
                bulkUploadBtn.disabled = false; // Enable upload process execution
                showMessage("JSON parsed successfully. Ready to upload.", "success");
            } else {
                throw new Error("JSON structure must be a top-level Array.");
            }
        } catch (err) {
            showMessage("Invalid JSON layout: " + err.message, "error");
            resetUploadSection();
        }
    };
    reader.readAsText(file);
});

// 3. Trigger Bulk upload process using writeBatch
bulkUploadBtn.addEventListener('click', async () => {
    if (!parsedJsonData || parsedJsonData.length === 0) return;

    bulkUploadBtn.disabled = true;
    showMessage("Processing batch write...", "success");

    try {
        const batch = writeBatch(db);
        const usersCollectionRef = collection(db, "Income");

        parsedJsonData.forEach((item) => {
            // Option A: If your JSON has a unique record property to use as Document ID (e.g., item.id)
            // const docRef = doc(usersCollectionRef, String(item.id));
            
            // Option B: Generate automatic unique Firestore random hashes as keys
            const docRef = doc(usersCollectionRef); 
            
            batch.set(docRef, {
                RoomNo: item.RoomNo || "Anonymous",
                TrnDate: item.TrnDate || "Anonymous",
				PaymentMode: item.PaymentMode || "Anonymous",
                ReferenceNumber: item.ReferenceNumber || "Anonymous",
				Amount: item.Amount || "Anonymous",
                Comments: item.Comments || "Anonymous",
                CreatedDate: new Date()
            });
        });

        await batch.commit();
        showMessage(`Successfully bulk uploaded ${parsedJsonData.length} records!`, "success");
        
        resetUploadSection();
        fetchAndRenderTable(); // Refresh the table list data layout

    } catch (error) {
        console.error("Bulk Upload Error: ", error);
        showMessage("Upload failed: " + error.message, "error");
        bulkUploadBtn.disabled = false;
    }
});

// 4. Global Action Handling Clear
deleteAllBtn.addEventListener('click', async () => {
    const querySnapshot = await getDocs(collection(db, "Income"));
    if (querySnapshot.empty) return showMessage("Nothing here to clear.", "error");

    if (confirm("Wipe all data records?")) {
        const batch = writeBatch(db);
        querySnapshot.forEach(docSnap => batch.delete(doc(db, "Income", docSnap.id)));
        await batch.commit();
        showMessage("Collection wiped clean.", "success");
        fetchAndRenderTable();
    }
});

function resetUploadSection() {
    parsedJsonData = null;
    jsonFileInput.value = "";
    fileNameDisplay.innerText = "No file selected";
    bulkUploadBtn.disabled = true;
}

function showMessage(text, type) {
    statusMessage.innerText = text;
    statusMessage.className = `message ${type}`;
}

// Boot setup
fetchAndRenderTable();
