const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
const message = document.querySelector('#message');

const storageKey = 'workshop-projects-v1';

let projects = [];
let editingId = null;
let storageReady = false;

function showMessage(text) {
    message.textContent = text;
}

function resetForm() {
    form.reset();
    editingId = null;

    saveButton.textContent = 'Add Project';
    cancelButton.style.display = 'none';
    formTitle.textContent = 'Add Project';

    nameInput.focus();
}

function saveProjects() {
    try {
        localStorage.setItem(
            storageKey,
            JSON.stringify(projects)
        );

        showMessage('Changes saved in this browser.');
        return true;
    } catch (error) {
        showMessage(
            'Changes could not be saved in this browser.'
        );
        return false;
    }
}

function loadProjects() {
    let savedData;

    try {
        savedData = localStorage.getItem(storageKey);
    } catch (error) {
        showMessage(
            'Could not read saved projects. Check browser storage settings.'
        );
        return;
    }

    if (savedData === null) {
        projects = [];
        storageReady = true;
        renderProjects();
        return;
    }

    try {
        const parsedData = JSON.parse(savedData);

        const validData = Array.isArray(parsedData) &&
            parsedData.every(project =>
                project &&
                typeof project.id === 'string' &&
                typeof project.name === 'string' &&
                typeof project.status === 'string'
            );

        if (!validData) {
            showMessage(
                'Saved project data is invalid. It has not been overwritten.'
            );
            return;
        }

        projects = parsedData;
        storageReady = true;
        renderProjects();
    } catch (error) {
        showMessage(
            'Saved project data could not be read. It has not been overwritten.'
        );
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

        editButton.addEventListener('click', () => {
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

        deleteButton.addEventListener('click', () => {
            const confirmed = confirm(
                'Are you sure you want to delete "' +
                project.name + '"?'
            );

            if (!confirmed) {
                return;
            }

            if (!storageReady) {
                showMessage(
                    'Cannot delete until saved projects can be loaded.'
                );
                return;
            }

            const index = projects.findIndex(
                item => item.id === project.id
            );

            if (index === -1) {
                return;
            }

            const deletedProject = projects[index];
            projects.splice(index, 1);

            if (!saveProjects()) {
                projects.splice(index, 0, deletedProject);
                renderProjects();
                return;
            }

            if (editingId === project.id) {
                resetForm();
            }

            renderProjects();
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

form.addEventListener('submit', event => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const status = statusInput.value;

    if (name === '') {
        alert('Please enter a project name.');
        nameInput.focus();
        return;
    }

    if (!storageReady) {
        showMessage(
            'Projects are not loaded safely. No changes were made.'
        );
        return;
    }

    if (editingId !== null) {
        const project = projects.find(
            item => item.id === editingId
        );

        if (!project) {
            resetForm();
            showMessage('That project could not be found.');
            return;
        }

        const oldName = project.name;
        const oldStatus = project.status;

        project.name = name;
        project.status = status;

        if (!saveProjects()) {
            project.name = oldName;
            project.status = oldStatus;
            renderProjects();
            return;
        }
    } else {
        const project = {
            id: crypto.randomUUID(),
            name: name,
            status: status
        };

        projects.push(project);

        if (!saveProjects()) {
            projects.pop();
            renderProjects();
            return;
        }
    }

    renderProjects();
    resetForm();
});

cancelButton.addEventListener('click', () => {
    resetForm();
});

loadProjects();
