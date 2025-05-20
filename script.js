// webapp/script.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-form');
    const messageArea = document.getElementById('message-area');
    const userInfoArea = document.getElementById('user-info');
    const submitButton = document.getElementById('submit-button');
    const imagePreview = document.getElementById('image-preview');
    const bolImageInput = document.getElementById('bol-image');

    // !!! ВАЖНО: Замените это на URL вашего бэкенда, который выводится в консоли main.py !!!
    // Например: "https://xxxxxxxxxxxx.ngrok-free.app/web/submit_report"
    const backendApiUrl = "https://fae9-83-24-135-174.ngrok-free.app/web/submit_report";

    let tgUser = null;

    // Вывод URL для проверки
    console.log("Using backendApiUrl:", backendApiUrl);
    showMessage(`Attempting to use backend: ${backendApiUrl}`, "info"); // Отображаем URL на странице

    try {
        Telegram.WebApp.ready();
        tgUser = Telegram.WebApp.initDataUnsafe.user;

        if (tgUser && tgUser.id) {
            userInfoArea.textContent = `Submitting as: ${tgUser.first_name || ''} ${tgUser.last_name || ''} (ID: ${tgUser.id})`;
            Telegram.WebApp.MainButton.setText("Submit Report");
            Telegram.WebApp.MainButton.show();
            Telegram.WebApp.MainButton.onClick(handleSubmitViaTelegramButton);
            submitButton.style.display = 'none';
        } else {
            const noUserDataMessage = "Could not retrieve Telegram user data. Please open this page through the bot.";
            userInfoArea.textContent = noUserDataMessage;
            showMessage(noUserDataMessage, "error");
            if (submitButton) submitButton.disabled = true;
        }
    } catch (error) {
        console.error("Telegram WebApp script error:", error);
        const telegramErrorMessage = `Error initializing Telegram WebApp. Ensure you are opening this from Telegram. Error: ${error.message}`;
        userInfoArea.textContent = telegramErrorMessage;
        showMessage(telegramErrorMessage, "error");
        if (submitButton) submitButton.disabled = true;
    }
    
    if (bolImageInput) {
        bolImageInput.addEventListener('change', function(event) {
            if (event.target.files && event.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if(imagePreview) {
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                    }
                }
                reader.readAsDataURL(event.target.files[0]);
            } else {
                if(imagePreview) {
                    imagePreview.src = '#';
                    imagePreview.style.display = 'none';
                }
            }
        });
    }

    async function handleSubmitViaTelegramButton() {
        await submitFormData();
    }

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await submitFormData();
        });
    }

    async function submitFormData() {
        if (!tgUser || !tgUser.id) {
            showMessage("Cannot submit: Telegram user information is missing.", "error");
            return;
        }
        if (backendApiUrl === "YOUR_BACKEND_API_URL_HERE/web/submit_report" || !backendApiUrl.startsWith("https://")) {
            showMessage(`Frontend Error: Backend API URL is not configured correctly or is not HTTPS. Current URL: ${backendApiUrl}`, "error");
            return;
        }

        const formData = new FormData(form);
        formData.append('telegram_user_id', tgUser.id);
        formData.append('telegram_user_fullname', `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim());

        if(Telegram.WebApp.MainButton.isVisible) Telegram.WebApp.MainButton.showProgress(false);
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }
        showMessage('Attempting to submit...', 'info'); // Сообщение о начале отправки

        try {
            showMessage(`Sending request to: ${backendApiUrl}`, 'info'); // Лог URL перед fetch
            const response = await fetch(backendApiUrl, {
                method: 'POST',
                body: formData,
                // CORS заголовки обычно устанавливаются браузером автоматически для FormData
                // но если есть проблемы, можно попробовать добавить mode: 'cors'
                // mode: 'cors', // Раскомментируйте, если есть подозрения на специфичные проблемы CORS
            });

            showMessage(`Response status: ${response.status}`, 'info'); // Лог статуса ответа

            const resultText = await response.text(); // Сначала получаем текстовый ответ
            showMessage(`Raw response text: ${resultText}`, 'info'); // Лог сырого ответа

            // Пытаемся парсить JSON только если Content-Type это json
            let result;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                result = JSON.parse(resultText);
            } else {
                // Если не JSON, возможно, это HTML ошибка от ngrok или что-то еще
                throw new Error(`Received non-JSON response (Content-Type: ${contentType}). Body: ${resultText}`);
            }


            if (response.ok && result.status === 'success') {
                showMessage(result.message || 'Report submitted successfully!', 'success');
                if (form) form.reset();
                if (imagePreview) imagePreview.style.display = 'none';
                // Telegram.WebApp.close(); // Можно раскомментировать для закрытия после успеха
            } else {
                throw new Error(result.message || `Server error: ${response.status} - ${resultText}`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            // Выводим более детальную информацию об ошибке
            let errorMessage = `Submission Error: ${error.message || 'Unknown error'}`;
            if (error.stack) {
                errorMessage += `\nStack: ${error.stack}`;
            }
            if (error.cause) { // Для FetchError и подобных
                 errorMessage += `\nCause: ${JSON.stringify(error.cause)}`;
            }
            showMessage(errorMessage, 'error');
        } finally {
            if(Telegram.WebApp.MainButton.isVisible) Telegram.WebApp.MainButton.hideProgress();
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Report';
            }
        }
    }

    function showMessage(message, type) {
        if (messageArea) {
            // Добавляем новое сообщение, не затирая старые, для лучшего лога
            const messageElement = document.createElement('div');
            messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${type.toUpperCase()}: ${message}`;
            messageElement.className = type; // 'success', 'error', 'info'
            
            // Вставляем новое сообщение в начало
            messageArea.insertBefore(messageElement, messageArea.firstChild);

            // Ограничиваем количество сообщений, чтобы не переполнять
            while (messageArea.childNodes.length > 20) {
                messageArea.removeChild(messageArea.lastChild);
            }
        } else {
            console.warn("messageArea element not found in DOM for message:", message);
        }
    }
});
