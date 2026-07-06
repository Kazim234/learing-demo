var taskInput = document.getElementById("taskInput");
var addBtn = document.getElementById("addBtn");
var taskList = document.getElementById("taskList");

var tasks = [];

function renderTasks() {
    taskList.innerHTML = "";

    tasks.forEach(function(task, index) {
        var li = document.createElement("li");
        li.innerHTML = `
            <span>${task}</span>
            <div class="actions">
                <button onclick="editTask(${index})">Edit</button>
                <button onclick="deleteTask(${index})">Delete</button>
            </div>
        `;
        taskList.appendChild(li);
    });
}

addBtn.addEventListener("click", function() {
    var task = taskInput.value.trim();
    if(task === "") {
        alert("Please enter a task.");
        return;
    }
    tasks.unshift(task);
    taskInput.value = "";
    renderTasks();
})

function editTask(index) {
    var updatedTask = prompt("Edit your task:", tasks[index]);
    if(updatedTask !== null && updatedTask.trim() !== "") {
        tasks[index] = updatedTask.trim();
        renderTasks();
    }
}

function deleteTask(index) {
    tasks.splice(index, 1);
    renderTasks();
}