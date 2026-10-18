
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
const message = document.querySelector('#message');

let projects = [];
let editingId = null;
let storageReady = false;
let requestInProgress = false;

function showMessage(text) {
    message.textContent = text;
}

function setBusy(busy) {
    requestInProgress = busy;
    saveButton.disabled = busy;
    cancelButton.disabled = busy;
}

function resetForm() {
    form.reset();
    editingId = null;

    saveButton.textContent = 'Add Project';
    cancelButton.style.display = 'none';
    formTitle.textContent = 'Add Project';

    nameInput.focus();
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    });

    if (!response.ok) {
        let errorMessage = `Request failed (${response.status}).`;

        try {
            const data = await response.json();
            if (data.error) errorMessage = data.error;
        } catch {
            // Keep the default error message.
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) return null;
    return response.json();
}

async function loadProjects() {
    storageReady = false;
    showMessage('Loading projects...');

    try {
        projects = await apiRequest('/api/projects');
        storageReady = true;
        renderProjects();
        showMessage('Projects loaded from the database.');
    } catch (error) {
        showMessage(
            'Could not load projects from the server. Check that it is running, then refresh.'
        );
        console.error(error);
    }
}

function renderProjects() {
    projectList.textContent = '';

    projects.forEach(project => {
        const li = document.createElement('li');
        const name = document.createElement('h3');
        const status = document.createElement('p');
        const editButton = document.createElement('button');
        const deleteButton = document.createElement('button');

        name.textContent = project.name;
        status.textContent = 'Status: ' + project.status;

        editButton.textContent = 'Edit';
        editButton.type = 'button';
        editButton.disabled = requestInProgress;

        editButton.addEventListener('click', () => {
            if (requestInProgress) return;

            editingId = project.id;
            nameInput.value = project.name;
            statusInput.value = project.status;

            saveButton.textContent = 'Save changes';
            cancelButton.style.display = 'inline-block';
            formTitle.textContent = 'Edit Project';

            nameInput.focus();
        });

        deleteButton.textContent = 'Delete';
        deleteButton.type = 'button';
        deleteButton.disabled = requestInProgress;

        deleteButton.addEventListener('click', async () => {
            if (requestInProgress) return;

            const confirmed = confirm(
                `Are you sure you want to delete "${project.name}"?`
            );

            if (!confirmed) return;

            setBusy(true);

            try {
                await apiRequest(
                    `/api/projects/${encodeURIComponent(project.id)}`,
                    { method: 'DELETE' }
                );

                projects = projects.filter(
                    item => String(item.id) !== String(project.id)
                );

                if (String(editingId) === String(project.id)) {
                    form.reset();
                    editingId = null;
                    saveButton.textContent = 'Add Project';
                    cancelButton.style.display = 'none';
                    formTitle.textContent = 'Add Project';
                }

                renderProjects();
                showMessage('Project deleted.');
            } catch (error) {
                showMessage(error.message);
                console.error(error);
            } finally {
                setBusy(false);
                renderProjects();
            }
        });

        li.appendChild(name);
        li.appendChild(status);
        li.appendChild(editButton);
        li.appendChild(deleteButton);

        projectList.appendChild(li);
    });

    emptyState.style.display =
        projects.length === 0 ? 'block' : 'none';
}

form.addEventListener('submit', async event => {
    event.preventDefault();

    if (requestInProgress) return;

    const name = nameInput.value.trim();
    const status = statusInput.value;

    if (name === '') {
        alert('Please enter a project name.');
        nameInput.focus();
        return;
    }

    if (!storageReady) {
        showMessage('Projects are not loaded. Please try again.');
        return;
    }

    const payload = { name, status };
    const wasEditing = editingId !== null;
    const targetId = editingId;

    setBusy(true);

    try {
        let savedProject;

        if (wasEditing) {
            savedProject = await apiRequest(
                `/api/projects/${encodeURIComponent(targetId)}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                }
            );

            projects = projects.map(project =>
                String(project.id) === String(targetId)
                    ? savedProject
                    : project
            );

            showMessage('Project updated in the database.');
        } else {
            savedProject = await apiRequest('/api/projects', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            projects.push(savedProject);
            showMessage('Project added to the database.');
        }

        renderProjects();
        form.reset();
        editingId = null;
        saveButton.textContent = 'Add Project';
        cancelButton.style.display = 'none';
        formTitle.textContent = 'Add Project';
    } catch (error) {
        showMessage(error.message);
        console.error(error);
    } finally {
        setBusy(false);
        renderProjects();
    }
});

cancelButton.addEventListener('click', () => {
    if (requestInProgress) return;
    resetForm();
});

loadProjects();