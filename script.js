// webapp/script.js
document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_VERSION = "v1.1"; // <<-- Попробуйте изменять это значение при каждом обновлении на GitHub

    const form = document.getElementById('report-form');
    const messageArea = document.getElementById('message-area');
    const userInfoArea = document.getElementById('user-info');
    const submitButton = document.getElementById('submit-button');
    const imagePreview = document.getElementById('image-preview');
    const bolImageInput = document.getElementById('bol-image');

    // !!! ВАЖНО: Замените это на URL вашего бэкенда, который выводится в консоли main.py !!!
    // Например: "https://xxxxxxxxxxxx.ngrok-free.app/web/submit_report"
    const backendApiUrl = "https://fae9-83-24-135-174.ngrok-free.app/web/submit_report"; // Оставьте это как есть, если вы всегда копируете актуальный URL из консоли main.py при запуске

    let tgUser = null;

    // Вывод URL для проверки
    console.log(`Script version: ${SCRIPT_VERSION}, Using backendApiUrl:`, backendApiUrl);
    showMessage(`[Script ${SCRIPT_VERSION}] Initializing. Backend URL configured as: ${backendApiUrl}`, "info");

    if (backendApiUrl === "YOUR_BACKEND_API_URL_HERE/web/submit_report" || !backendApiUrl.startsWith("https://")) {
        showMessage(`[Script ${SCRIPT_VERSION}] FATAL ERROR: backendApiUrl is not correctly set in script.js! Please update it with the ngrok URL from your bot's console. Current value: ${backendApiUrl}`, "error");
        // Отключаем дальнейшую инициализацию, если URL не настроен
        if (submitButton) submitButton.disabled = true;
        if (Telegram.WebApp.MainButton.isVisible) Telegram.WebApp.MainButton.disable();
        return; // Прекращаем выполнение, если URL не настроен
    }


    try {
        Telegram.WebApp.ready();
        tgUser = Telegram.WebApp.initDataUnsafe.user;

        if (tgUser && tgUser.id) {
            userInfoArea.textContent = `Submitting as: ${tgUser.first_name || ''} ${tgUser.last_name || ''} (ID: ${tgUser.id})`;
            Telegram.WebApp.MainButton.setText("Submit Report");
            Telegram.WebApp.MainButton.show();
            Telegram.WebApp.MainButton.onClick(handleSubmitViaTelegramButton);
            if (submitButton) submitButton.style.display = 'none';
        } else {
            const noUserDataMessage = "[Script ${SCRIPT_VERSION}] Could not retrieve Telegram user data. Please open this page through the bot.";
            userInfoArea.textContent = noUserDataMessage;
            showMessage(noUserDataMessage, "error");
            if (submitButton) submitButton.disabled = true;
        }
    } catch (error) {
        console.error("Telegram WebApp script error:", error);
        const telegramErrorMessage = `[Script ${SCRIPT_VERSION}] Error initializing Telegram WebApp. Ensure you are opening this from Telegram. Error: ${error.message}`;
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
        // Проверка backendApiUrl уже была выше, но можно оставить для надежности
        if (backendApiUrl === "YOUR_BACKEND_API_URL_HERE/web/submit_report" || !backendApiUrl.startsWith("https://")) {
            showMessage(`[Script ${SCRIPT_VERSION}] Frontend Error: Backend API URL is not configured correctly or is not HTTPS. Current URL: ${backendApiUrl}`, "error");
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
        showMessage(`[Script ${SCRIPT_VERSION}] Attempting to submit...`, 'info');

        try {
            showMessage(`[Script ${SCRIPT_VERSION}] Sending request to: ${backendApiUrl}`, 'info');
            const response = await fetch(backendApiUrl, {
                method: 'POST',
                body: formData,
                // mode: 'cors', // Можно раскомментировать для теста, если есть подозрения на CORS
            });

            showMessage(`[Script ${SCRIPT_VERSION}] Response status: ${response.status}`, 'info');

            const resultText = await response.text();
            showMessage(`[Script ${SCRIPT_VERSION}] Raw response text: ${resultText}`, 'info');

            let result;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                result = JSON.parse(resultText);
            } else {
                throw new Error(`Received non-JSON response (Content-Type: ${contentType}). Body: ${resultText}`);
            }

            if (response.ok && result.status === 'success') {
                showMessage(`[Script ${SCRIPT_VERSION}] ${result.message || 'Report submitted successfully!'}`, 'success');
                if (form) form.reset();
                if (imagePreview) imagePreview.style.display = 'none';
            } else {
                throw new Error(result.message || `Server error: ${response.status} - ${resultText}`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            let errorMessage = `[Script ${SCRIPT_VERSION}] Submission Error: ${error.message || 'Unknown error'}`;
            if (error.stack) {
                errorMessage += `\nStack: ${error.stack.substring(0, 300)}`; // Ограничиваем длину стека
            }
            if (error.cause) { 
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
            const messageElement = document.createElement('div');
            messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${type.toUpperCase()}: ${message}`;
            messageElement.className = type;
            
            messageArea.insertBefore(messageElement, messageArea.firstChild);
            while (messageArea.childNodes.length > 20) {
                messageArea.removeChild(messageArea.lastChild);
            }
        } else {
            console.warn("messageArea element not found in DOM for message:", message);
        }
    }
});
