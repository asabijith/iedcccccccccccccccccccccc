document.addEventListener('DOMContentLoaded', () => {
    // Simple admin authentication
    const isAdmin = prompt('Enter admin password:');
    if (isAdmin !== 'Admin@007') {
        alert('Access denied. Redirecting to main page.');
        window.location.href = 'index.html';
        return;
    }

    const tableBody = document.querySelector('#candidatesTable tbody');
    const loading = document.getElementById('loading');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Modal Elements
    const modal = document.getElementById('editModal');
    const closeModal = document.querySelector('.close-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const updateForm = document.getElementById('updateForm');
    
    // Form Elements
    const editId = document.getElementById('editId');
    const editName = document.getElementById('editName');
    const editStatus = document.getElementById('editStatus');
    const editTime = document.getElementById('editTime');
    const editLink = document.getElementById('editLink');
    const editNotes = document.getElementById('editNotes');
    const interviewTimeGroup = document.getElementById('interviewTimeGroup');
    const meetLinkGroup = document.getElementById('meetLinkGroup');

    // Initial Load
    fetchCandidates();

    refreshBtn.addEventListener('click', fetchCandidates);

    async function fetchCandidates() {
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

        loading.style.display = 'block';
        tableBody.innerHTML = '';

        try {
            const { data, error } = await window.supabaseClient
                .from('execom_registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            if (data && data.length > 0) {
                data.forEach(candidate => {
                    const row = document.createElement('tr');
                    
                    // Format Date
                    let timeDisplay = '-';
                    if (candidate.interview_time) {
                        const date = new Date(candidate.interview_time);
                        timeDisplay = `<span class="hide-mobile">${date.toLocaleDateString()}</span><br/><small>${date.toLocaleTimeString()}</small>`;
                    }

                    // Format positions
                    const positionsDisplay = `
                        <div style="font-size: 0.85rem;">
                            <div ${candidate.selected_position === candidate.position1 ? 'style="color: var(--success); font-weight: 600;"' : ''}><strong>1st:</strong> ${candidate.position1} ${candidate.selected_position === candidate.position1 ? '<span style="color: var(--success); font-weight: bold;">&check;</span>' : ''}</div>
                            <div ${candidate.selected_position === candidate.position2 ? 'style="color: var(--success); font-weight: 600;"' : 'style="color: var(--text-muted);"'}><strong>2nd:</strong> ${candidate.position2} ${candidate.selected_position === candidate.position2 ? '<span style="color: var(--success); font-weight: bold;">&check;</span>' : ''}</div>
                            ${candidate.selected_position ? `<div style="color: var(--success); font-weight: 500; margin-top: 0.25rem; font-size: 0.8rem;">Selected: ${candidate.selected_position}</div>` : ''}
                        </div>
                    `;

                    // Status badge with better styling
                    const statusClass = candidate.status ? candidate.status.toLowerCase().replace(/\s+/g, '-') : 'pending';
                    const statusBadge = `<span class="status-badge status-${statusClass}">${candidate.status || 'Pending'}</span>`;

                    // Format admin notes display
                    const notesDisplay = candidate.admin_notes ? 
                        `<div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem;" title="${candidate.admin_notes}">${candidate.admin_notes}</div>` : 
                        '<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>';

                    row.innerHTML = `
                        <td>
                            <div style="font-weight: 500;">${candidate.full_name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">${candidate.branch} - ${candidate.year}</div>
                        </td>
                        <td><a href="mailto:${candidate.email}" style="color: var(--primary-color); text-decoration: none;">${candidate.email}</a></td>
                        <td class="hide-mobile">${candidate.branch}</td>
                        <td>${positionsDisplay}</td>
                        <td>${statusBadge}</td>
                        <td class="hide-mobile">${timeDisplay}</td>
                        <td class="hide-mobile">${notesDisplay}</td>
                        <td>
                            <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" onclick="openEditModal(${candidate.id})">
                                <span class="hide-mobile">Manage</span>
                                <span class="show-mobile">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                    </svg>
                                </span>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No registrations found.</td></tr>';
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error fetching data.');
        } finally {
            loading.style.display = 'none';
        }
    }

    // Make openEditModal global so it can be called from HTML onclick
    window.openEditModal = async (id) => {
        if (!window.supabaseClient || !window.supabase) {
            alert('System not ready. Please refresh the page.');
            return;
        }
        
        if (!id || isNaN(id)) {
            alert('Invalid candidate ID.');
            return;
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('execom_registrations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Fetch error:', error);
                throw new Error(error.message || 'Failed to load candidate data');
            }

            if (data) {
                editId.value = data.id;
                editName.value = data.full_name;
                editStatus.value = data.status || 'Pending';
                
                // Set position information
                document.getElementById('position1Text').textContent = data.position1;
                document.getElementById('position2Text').textContent = data.position2;
                document.getElementById('pos1Option').value = data.position1;
                document.getElementById('pos1Option').textContent = data.position1;
                document.getElementById('pos2Option').value = data.position2;
                document.getElementById('pos2Option').textContent = data.position2;
                
                // Set selected position if exists
                const editSelectedPosition = document.getElementById('editSelectedPosition');
                editSelectedPosition.value = ''; // Clear first
                if (data.selected_position) {
                    editSelectedPosition.value = data.selected_position;
                }
                
                // Format datetime-local input (YYYY-MM-DDThh:mm)
                if (data.interview_time) {
                    const d = new Date(data.interview_time);
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                    editTime.value = d.toISOString().slice(0, 16);
                } else {
                    editTime.value = '';
                }

                editLink.value = data.meet_link || '';
                editNotes.value = data.admin_notes || '';

                toggleFields();
                modal.classList.add('active');
            }
        } catch (err) {
            console.error('Load candidate error:', err);
            alert(`Error loading candidate details: ${err.message || 'Unknown error'}`);
        }
    };

    // Toggle fields based on status
    editStatus.addEventListener('change', toggleFields);

    function toggleFields() {
        const selectedPositionGroup = document.getElementById('selectedPositionGroup');
        const editSelectedPosition = document.getElementById('editSelectedPosition');
        
        if (editStatus.value === 'Interview Scheduled') {
            interviewTimeGroup.style.display = 'block';
            meetLinkGroup.style.display = 'block';
            selectedPositionGroup.style.display = 'none';
            editTime.required = true;
            editLink.required = true;
            editSelectedPosition.required = false; // Remove required when hidden
        } else if (editStatus.value === 'Selected') {
            interviewTimeGroup.style.display = 'none';
            meetLinkGroup.style.display = 'none';
            selectedPositionGroup.style.display = 'block';
            editTime.required = false;
            editLink.required = false;
            editSelectedPosition.required = true; // Only required when visible
        } else {
            interviewTimeGroup.style.display = 'none';
            meetLinkGroup.style.display = 'none';
            selectedPositionGroup.style.display = 'none';
            editTime.required = false;
            editLink.required = false;
            editSelectedPosition.required = false; // Remove required when hidden
        }
    }

    // Close Modal
    const close = () => modal.classList.remove('active');
    closeModal.addEventListener('click', close);
    closeModalBtn.addEventListener('click', close);
    window.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    // Update Candidate
    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validation
        if (!editId.value) {
            alert('No candidate selected for update.');
            return;
        }
        
        if (!window.supabaseClient || !window.supabase) {
            alert('System not ready. Please refresh and try again.');
            return;
        }
        
        // Validate required fields based on status
        if (editStatus.value === 'Interview Scheduled') {
            if (!editTime.value) {
                alert('Interview time is required when status is "Interview Scheduled".');
                return;
            }
            if (!editLink.value) {
                alert('Meet link is required when status is "Interview Scheduled".');
                return;
            }
        }
        
        if (editStatus.value === 'Selected') {
            const selectedPos = document.getElementById('editSelectedPosition').value;
            if (!selectedPos) {
                alert('Please select which position was offered.');
                return;
            }
        }
        
        const updates = {
            status: editStatus.value,
            admin_notes: editNotes.value || null,
            interview_time: editTime.value ? new Date(editTime.value).toISOString() : null,
            meet_link: editLink.value || null,
            selected_position: document.getElementById('editSelectedPosition').value || null
        };
        
        // Show loading state
        const submitBtn = updateForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        try {
            const { error } = await window.supabaseClient
                .from('execom_registrations')
                .update(updates)
                .eq('id', parseInt(editId.value));

            if (error) {
                console.error('Supabase error:', error);
                throw new Error(error.message || 'Database update failed');
            }

            alert('Candidate updated successfully!');
            close();
            fetchCandidates();
        } catch (err) {
            console.error('Update error:', err);
            alert(`Error updating candidate: ${err.message || 'Unknown error occurred'}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});
