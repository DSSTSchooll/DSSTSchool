let editor, codeMirrorEditor;
const historyContainer = document.getElementById('history');
const saveButton = document.getElementById('save-button');
const loadingIndicator = document.getElementById('loading-indicator');
const commentInput = document.getElementById('comment-input');
const languageSelector = document.getElementById('language-selector');

// Инициализация CodeMirror для подсветки синтаксиса
window.onload = function() {
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'javascript';
    initializeEditor(savedLanguage);
    loadHistory();

    // Активируем кнопку сохранения, если были изменения
    codeMirrorEditor.on("change", function() {
        saveButton.disabled = false;
    });
};

// Инициализация редактора с выбранным языком
function initializeEditor(language) {
    codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        lineNumbers: true,
        mode: language,
        theme: "dracula", // Установим тему
        matchBrackets: true,
        autoCloseBrackets: true,
        hintOptions: { completeSingle: false },
    });
}

// Изменение языка подсветки синтаксиса
function changeLanguage() {
    const selectedLanguage = languageSelector.value;
    localStorage.setItem('selectedLanguage', selectedLanguage);
    codeMirrorEditor.setOption("mode", selectedLanguage);
}

function saveCode() {
    const code = codeMirrorEditor.getValue();
    const comment = commentInput.value.trim();
    const userName = document.getElementById('user-name').value.trim(); // Получаем имя пользователя

    if (code) {
        const timestamp = new Date();
        localStorage.setItem('currentCode', code);

        // Создаем объект для истории
        const history = JSON.parse(localStorage.getItem('codeHistory')) || [];
        history.unshift({
            code,
            timestamp: timestamp.toLocaleString(),
            comment,
            userName: userName || 'Anonymous', // Если имя не введено, ставим 'Anonymous'
        });
        localStorage.setItem('codeHistory', JSON.stringify(history));

        showLoading(true);

        setTimeout(() => {
            showLoading(false);
            saveButton.disabled = true;
            loadHistory();

            // Очистка редактора и комментариев
            codeMirrorEditor.setValue("");  // Очищаем редактор
            commentInput.value = ""; // Очищаем поле комментария
            document.getElementById('user-name').value = ""; // Очищаем поле имени

            // Показать уведомление о сохранении
            showSaveNotification();

            // Отправляем данные в Google Таблицу
            saveToGoogleSheets(code, comment, userName, timestamp);
        }, 1000);
    }
}

function saveToGoogleSheets(code, comment, userName, timestamp) {
    const url = 'https://script.google.com/macros/s/AKfycbw39jefqhstw7dbfvUqS7lbfAzs0ob6drbXoZuPw8SucM3hPwIicmP6-loAt2k7EO4/exec';

    const data = {
        code: code,
        comment: comment,
        userName: userName || 'Anonymous',
        timestamp: timestamp.toLocaleString(),
    };

    console.log("Sending data:", data); // Логируем отправляемые данные

    // Отправка данных через POST
    fetch(url, {
        method: 'POST',
        body: new URLSearchParams(data),  // Убедитесь, что данные правильно сериализуются
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',  // Указываем правильный тип контента
        }
    })
    .then(response => response.json())
    .then(result => {
        console.log('Successfully saved to Google Sheets:', result);
    })
    .catch(error => {
        console.error('Error saving to Google Sheets:', error);
    });
}


function showSaveNotification() {
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = 'Code saved successfully!';
    document.body.appendChild(notification);

    // Убираем уведомление через 3 секунды
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Загрузка истории
function loadHistory() {
    historyContainer.innerHTML = '';
    const history = JSON.parse(localStorage.getItem('codeHistory')) || [];

    history.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.onclick = () => restoreCode(index);  // Восстановление кода при клике

        div.innerHTML = `
            <strong>Revision #${history.length - index}</strong>
            <span>${entry.timestamp}</span>
            <div class="history-user-name"><strong>By: </strong>${entry.userName}</div> <!-- Добавляем имя пользователя -->
            <div contenteditable="true" class="history-comment">${entry.comment || 'No comment'}</div>
        `;

        historyContainer.appendChild(div);
    });
}

// Восстановление кода из истории
function restoreCode(index) {
    const history = JSON.parse(localStorage.getItem('codeHistory'));
    if (history && history[index]) {
        codeMirrorEditor.setValue(history[index].code);
    }

    // Подсвечиваем выбранную версию
    const items = document.querySelectorAll('.history-item');
    items.forEach(item => item.classList.remove('selected'));
    items[index].classList.add('selected');
}

// Скачать код в виде файла
function downloadCode() {
    const code = codeMirrorEditor.getValue();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Показать/скрыть индикатор загрузки
function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.style.display = 'block';
    } else {
        loadingIndicator.style.display = 'none';
    }
}

let CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'; // Ваш клиентский ID
let API_KEY = 'YOUR_API_KEY'; // Ваш API ключ
let DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
let SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let sheetId = 'YOUR_SPREADSHEET_ID'; // ID вашей Google Таблицы

// Инициализация клиента Google API
function gapiInit() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
        clientId: CLIENT_ID,
        scope: SCOPES,
    }).then(() => {
        gapiInited = true;
        maybeEnableSaving();
    });
}

// Инициализация клиента Google Identity Services
function gisInit() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
            gapi.client.setApiKey(API_KEY);
            gapi.client.request({
                path: '/oauth2/v4/token',
                method: 'POST',
                body: JSON.stringify(response),
            }).then(gapiInit);
        }
    });
    gisInited = true;
    maybeEnableSaving();
}

// Функция, которая включает сохранение, если инициализированы оба клиента
function maybeEnableSaving() {
    if (gapiInited && gisInited) {
        saveButton.addEventListener('click', saveCode);
    }
}

// Загрузка и инициализация Google API
function loadGoogleAPI() {
    gapi.load('client:auth2', gapiInit);
    google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
            gapi.client.setApiKey(API_KEY);
            gapi.client.request({
                path: '/oauth2/v4/token',
                method: 'POST',
                body: JSON.stringify(response),
            }).then(gapiInit);
        }
    });
    gisInit();
}
