(function() {
    const form = document.getElementById('contactForm');
    const feedback = document.getElementById('contactFeedback');

    if (!form) {
        return;
    }

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('opacity-70');
            submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>جاري الإرسال...</span>';
        }

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        payload.sentAt = new Date().toISOString();

        const pendingMessages = JSON.parse(localStorage.getItem('contractorpro_contact_messages') || '[]');
        pendingMessages.push(payload);
        localStorage.setItem('contractorpro_contact_messages', JSON.stringify(pendingMessages));

        if (feedback) {
            feedback.classList.remove('hidden');
            feedback.textContent = 'تم استلام رسالتك بنجاح، وسيتواصل معك فريقنا خلال 24 ساعة.';
            feedback.classList.remove('text-error');
            feedback.classList.add('text-success');
        }

        form.reset();

        if (submitButton) {
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.classList.remove('opacity-70');
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i><span>إرسال الرسالة</span>';
            }, 1200);
        }
    });
})();
