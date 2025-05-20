document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-form');
    const messageArea = document.getElementById('message-area');
    const userInfoArea = document.getElementById('user-info');
    const submitButton = document.getElementById('submit-button');
    const imagePreview = document.getElementById('image-preview');
    const bolImageInput = document.getElementById('bol-image');

    // !!! IMPORTANT: Configure this to your backend API endpoint !!!
    const backendApiUrl = "http://83.24.135.174:8081/web/submit_report"; // e.g., "http://localhost:8081/web/submit_report" for local testing or "https://yourdomain.com/web/submit_report"

    let tgUser = null;

    try {
        Telegram.WebApp.ready(); // Notify Telegram the web app is ready
        tgUser = Telegram.WebApp.initDataUnsafe.user;

        if (tgUser && tgUser.id) {
            userInfoArea.textContent = `Submitting as: ${tgUser.first_name || ''} ${tgUser.last_name || ''} (ID: ${tgUser.id})`;
            Telegram.WebApp.MainButton.setText("Submit Report");
            Telegram.WebApp.MainButton.show();
            Telegram.WebApp.MainButton.onClick(handleSubmitViaTelegramButton);
            submitButton.style.display = 'none'; // Hide HTML button if Telegram MainButton is used
        } else {
            userInfoArea.textContent = "Could not retrieve Telegram user data. Please open this page through the bot.";
            submitButton.disabled = true;
        }
    } catch (error) {
        console.error("Telegram WebApp script error:", error);
        userInfoArea.textContent = "Error initializing Telegram WebApp. Ensure you are opening this from Telegram.";
        submitButton.disabled = true;
    }
    
    bolImageInput.addEventListener('change', function(event) {
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            reader.readAsDataURL(event.target.files[0]);
        } else {
            imagePreview.src = '#';
            imagePreview.style.display = 'none';
        }
    });

    async function handleSubmitViaTelegramButton() {
        // This function is called when Telegram's MainButton is clicked
        await submitFormData();
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default HTML form submission
        await submitFormData();
    });

    async function submitFormData() {
        if (!tgUser || !tgUser.id) {
            showMessage("Cannot submit: Telegram user information is missing.", "error");
            return;
        }
        if (backendApiUrl === "YOUR_BACKEND_API_URL_HERE/web/submit_report") {
            showMessage("Frontend Error: Backend API URL is not configured in script.js.", "error");
            return;
        }


        const formData = new FormData(form);
        formData.append('telegram_user_id', tgUser.id);
        formData.append('telegram_user_fullname', `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim());

        // Visual feedback
        if(Telegram.WebApp.MainButton.isVisible) Telegram.WebApp.MainButton.showProgress(false); // Show progress on Telegram button
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        messageArea.textContent = '';
        messageArea.className = '';


        try {
            const response = await fetch(backendApiUrl, {
                method: 'POST',
                body: formData,
                // Headers are not typically needed for FormData with fetch,
                // as the browser sets 'Content-Type': 'multipart/form-data' automatically.
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                showMessage(result.message || 'Report submitted successfully!', 'success');
                form.reset();
                imagePreview.style.display = 'none';
                if (Telegram.WebApp.MainButton.isVisible) {
                     // Telegram.WebApp.close(); // Optionally close webapp on success
                }
            } else {
                showMessage(result.message || `Error: ${response.statusText}`, 'error');
            }
        } catch (error) {
            console.error('Submission error:', error);
            showMessage(`Network error or server unavailable: ${error.message}`, 'error');
        } finally {
            if(Telegram.WebApp.MainButton.isVisible) Telegram.WebApp.MainButton.hideProgress();
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Report';
        }
    }

    function showMessage(message, type) {
        messageArea.textContent = message;
        messageArea.className = type; // 'success' or 'error'
    }
});
