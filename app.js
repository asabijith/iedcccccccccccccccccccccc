document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const checkBtn = document.getElementById('checkStatusBtn');
    const loading = document.getElementById('loading');
    const resultCard = document.getElementById('resultCard');
    
    // Elements to populate
    const candidateName = document.getElementById('candidateName');
    const appliedPosition = document.getElementById('appliedPosition');
    const statusBadge = document.getElementById('statusBadge');
    const interviewSection = document.getElementById('interviewSection');
    const interviewTimeDisplay = document.getElementById('interviewTime');
    const joinBtn = document.getElementById('joinBtn');
    const waitMsg = document.getElementById('waitMsg');
    const messageSection = document.getElementById('messageSection');

    // Allow pressing Enter to check status
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkBtn.click();
        }
    });

    checkBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) {
            alert('Please enter your email address.');
            return;
        }

        // Wait for Supabase to load with better retry logic
        let attempts = 0;
        while (!window.supabaseLoaded && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // Give additional time for client initialization
        attempts = 0;
        while (!window.supabaseClient && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.supabaseClient || !window.supabase) {
            // Try one more time to initialize if components are ready
            if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY && !window.supabaseClient) {
                try {
                    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
                    console.log('Manual Supabase client initialization successful');
                } catch (error) {
                    console.error('Manual client initialization failed:', error);
                }
            }
            
            if (!window.supabaseClient) {
                alert('System initialization failed. Please refresh the page or try a different browser.');
                return;
            }
        }

        // UI Reset
        loading.style.display = 'block';
        resultCard.style.display = 'none';
        interviewSection.style.display = 'none';
        checkBtn.disabled = true;

        try {
            const { data, error } = await window.supabaseClient
                .from('execom_registrations')
                .select('*')
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            if (data) {
                displayResult(data);
            } else {
                alert('No registration found with this email. Please check your email address.');
            }
        } catch (err) {
            console.error('Error:', err);
            if (err.message.includes('JWT')) {
                alert('Authentication error. Please check your Supabase configuration.');
            } else {
                alert('Error fetching status: ' + (err.message || 'Please try again later.'));
            }
        } finally {
            loading.style.display = 'none';
            checkBtn.disabled = false;
        }
    });

    function displayResult(data) {
        resultCard.style.display = 'block';
        candidateName.textContent = data.full_name;
        
        // Display both applied positions and selected position
        let positionText = `Applied Positions:\n• 1st Choice: ${data.position1}\n• 2nd Choice: ${data.position2}`;
        if (data.selected_position && data.status && data.status.toLowerCase() === 'selected') {
            positionText += `\n\n<span style="color: var(--success); font-weight: bold;">&check;</span> Selected for: ${data.selected_position}`;
        }
        appliedPosition.innerHTML = positionText.replace(/\n/g, '<br>');
        
        // Display admin notes if available
        const adminNotesSection = document.getElementById('adminNotesSection');
        const adminNotesText = document.getElementById('adminNotesText');
        if (data.admin_notes && data.admin_notes.trim()) {
            adminNotesText.textContent = data.admin_notes;
            adminNotesSection.style.display = 'block';
        } else {
            adminNotesSection.style.display = 'none';
        }
        
        // Status Badge Logic
        statusBadge.className = 'status-badge';
        let statusText = data.status || 'Pending';
        
        switch(statusText.toLowerCase()) {
            case 'shortlisted':
                statusBadge.classList.add('status-shortlisted');
                break;
            case 'interview scheduled':
                statusBadge.classList.add('status-scheduled');
                break;
            case 'selected':
                statusBadge.classList.add('status-selected');
                break;
            case 'rejected':
                statusBadge.classList.add('status-rejected');
                break;
            default:
                statusBadge.classList.add('status-pending');
        }
        statusBadge.textContent = statusText;

        // Interview Logic
        if (statusText.toLowerCase() === 'interview scheduled' && data.interview_time) {
            interviewSection.style.display = 'block';
            const interviewDate = new Date(data.interview_time);
            
            // Format date nicely
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            interviewTimeDisplay.textContent = interviewDate.toLocaleDateString('en-US', dateOptions);

            // Check if it's time to join (10 mins before to 30 mins after start)
            checkInterviewTime(interviewDate, data.meet_link);
            
            // Set up a timer to re-check every minute
            if (window.interviewTimer) clearInterval(window.interviewTimer);
            window.interviewTimer = setInterval(() => checkInterviewTime(interviewDate, data.meet_link), 60000);
        } else {
            interviewSection.style.display = 'none';
            if (window.interviewTimer) clearInterval(window.interviewTimer);
        }

        // Custom Messages
        if (statusText.toLowerCase() === 'selected') {
            messageSection.innerHTML = `
                <p style="margin-bottom: 1rem; color: var(--success); font-weight: 600;">Congratulations! You have been selected for <strong>${data.selected_position || 'the position'}</strong>.</p>
                <div style="display: flex; justify-content: center;">
                    <video autoplay loop muted style="width: 200px; height: auto; border-radius: var(--border-radius);">
                        <source src="https://dl.dropbox.com/scl/fi/cujvgjf80ch0ae1gpidrk/Check-Mark-Success-Done-Complete-icon.webm?rlkey=jtfkdnmr2pk7fnhthfdtula48&st=mh0tgv4e&dl=0" type="video/webm">
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Your browser doesn't support video playback.</p>
                    </video>
                </div>
                <p style="margin-top: 1rem; color: var(--success);">We will contact you shortly with further details.</p>
            `;
        } else if (statusText.toLowerCase() === 'rejected') {
            messageSection.innerHTML = `
                <p style="margin-bottom: 1rem; color: var(--danger); font-weight: 500;">Thank you for your interest. Unfortunately, we are not moving forward with your application at this time.</p>
                <div style="display: flex; justify-content: center;">
                    <video autoplay loop muted style="width: 200px; height: auto; border-radius: var(--border-radius);">
                        <source src="https://dl.dropbox.com/scl/fi/eu2vf0dn32ltdzfyvgq7j/OCL-Rejected.webm?rlkey=th11zkhmecb0uc1onvlbo73l4&st=n50x7eft&dl=0" type="video/webm">
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Your browser doesn't support video playback.</p>
                    </video>
                </div>
                <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">We encourage you to apply for future opportunities.</p>
            `;
        } else if (statusText.toLowerCase() === 'shortlisted') {
            messageSection.innerHTML = `
                <p style="margin-bottom: 1rem; color: var(--primary-color); font-weight: 500;">Great news! You have been shortlisted for the next round.</p>
                <div style="display: flex; justify-content: center;">
                    <video autoplay loop muted style="width: 200px; height: auto; border-radius: var(--border-radius);">
                        <source src="https://dl.dropbox.com/scl/fi/axjhb1c3i7i0dj8g87mxs/Scroll-down-1.webm?rlkey=ay4tgcw3ycz1s5o9ryf7bf46c&st=4ywzk2fa&dl=0" type="video/webm">
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Your browser doesn't support video playback.</p>
                    </video>
                </div>
            `;
        } else if (statusText.toLowerCase() === 'interview scheduled') {
            messageSection.innerHTML = `
                <p style="margin-bottom: 1rem; color: var(--primary-color); font-weight: 500;">Your interview has been scheduled. Please be prepared!</p>
                <div style="display: flex; justify-content: center;">
                    <video autoplay loop muted style="width: 200px; height: auto; border-radius: var(--border-radius);">
                        <source src="https://dl.dropbox.com/scl/fi/wgs3i87cw0907qnfmo5ya/Recruitment.webm?rlkey=qc7u71f4ev3p2676gkzgg8dez&st=ti48ejn3&dl=0" type="video/webm">
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Your browser doesn't support video playback.</p>
                    </video>
                </div>
            `;
        } else if (statusText.toLowerCase() === 'pending') {
            messageSection.innerHTML = `
                <p style="margin-bottom: 1rem;">Your application is under review. We will update your status soon.</p>
                <div style="display: flex; justify-content: center;">
                    <video autoplay loop muted style="width: 200px; height: auto; border-radius: var(--border-radius);">
                        <source src="https://dl.dropbox.com/scl/fi/10t6ue304z4q76zuvaffq/Sleeping-Ant.webm?rlkey=i2qh1b9jjfyords81xfiuildk&st=9cp2yd7p&dl=0" type="video/webm">
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Your browser doesn't support video playbook.</p>
                    </video>
                </div>
            `;
        } else {
            messageSection.textContent = "";
        }
    }

    function checkInterviewTime(interviewDate, link) {
        const now = new Date();
        const diffMs = interviewDate - now;
        const diffMins = Math.floor(diffMs / 60000);

        // Logic: Show button if within 10 mins before start AND not more than 60 mins after start
        // diffMins is positive if interview is in future
        // diffMins is negative if interview started in past
        
        // Example: Interview at 10:00.
        // 09:45 -> diff is 15 mins. (Wait)
        // 09:50 -> diff is 10 mins. (Show)
        // 10:00 -> diff is 0 mins. (Show)
        // 10:30 -> diff is -30 mins. (Show)
        // 11:01 -> diff is -61 mins. (Hide - assuming interview over)

        if (diffMins <= 10 && diffMins >= -60) {
            joinBtn.href = link;
            joinBtn.style.display = 'inline-flex';
            waitMsg.style.display = 'none';
        } else if (diffMins > 10) {
            joinBtn.style.display = 'none';
            waitMsg.style.display = 'block';
            waitMsg.textContent = `Link will be active 10 minutes before the interview.`;
        } else {
            // Interview time passed
            joinBtn.style.display = 'none';
            waitMsg.style.display = 'block';
            waitMsg.textContent = "Interview time has passed.";
            waitMsg.style.color = 'var(--danger)';
        }
    }
});
