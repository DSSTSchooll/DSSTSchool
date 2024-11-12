let editor, codeMirrorEditor;
let editors = {};
let currentTab = 'file1';
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

// Сохранение кода и добавление в историю
function saveCode() {
    const code = codeMirrorEditor.getValue();
    const comment = commentInput.value.trim();

    if (code) {
        const timestamp = new Date();
        localStorage.setItem('currentCode', code);

        const history = JSON.parse(localStorage.getItem('codeHistory')) || [];
        history.unshift({ code, timestamp: timestamp.toLocaleString(), comment });
        localStorage.setItem('codeHistory', JSON.stringify(history));

        showLoading(true);

        setTimeout(() => {
            showLoading(false);
            saveButton.disabled = true;
            loadHistory();

            // Очистка редактора после сохранения
            codeMirrorEditor.setValue("");  // Очищаем содержимое редактора

            // Очистка комментария, если нужно
            commentInput.value = "";

            // Показать уведомление о сохранении
            showSaveNotification();  // Вызов уведомления
        }, 1000);
    }
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

