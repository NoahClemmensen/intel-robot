const dotenv = require('dotenv')
dotenv.config()

const statuses = {
    "Active": 1,
    "Stopped": 2,
    "Deleted": 3,
    "Failed": 4,
}

const locations = {
    "Denmark": 1,
    "Italy": 2,
    "Japan": 3
}

let robot = { // Default values
    serial_number: process.env.SERIAL_NUMBER,
    status: statuses.Active,
    location: locations.Denmark,
};

const MqttService = require('./MQTTService.js')

function updatedStatus(newStatus) {
    if (robot.status === newStatus) {
        console.log("Status is already " + newStatus);
        return;
    }

    // Notify system of status change
    MqttService.publishToTopic("robot/status_updated", JSON.stringify({
        serial_number: robot.serial_number,
        status: newStatus,
        reason: newStatus === statuses.Failed ? "Motor feedback detected obstruction. Immediate shutdown" : undefined,
    }));

    if (newStatus === "failed") {
        console.log("Robot failed. Waiting for restart...");
    }

    robot.status = newStatus;
}

function randomStatusChange() {
    const random = Math.random();

    if (random < 0.1) { // 10% risk to fail
        if (robot.status !== statuses.Failed) {
            console.log("Robot status changed to: Failed");
            updatedStatus(robot.status);
        }
    } else if (random < 0.55) { // 45% chance to stop
        console.log("Robot status changed to: Stopped");
        updatedStatus(robot.status);
    } else { // 45% chance to be active
        console.log("Robot status changed to: Active");
        updatedStatus(robot.status);
    }
}

MqttService.subscribeToTopic("system/register", (message) => {
    // Check if the serial number matches
    if (message.serial_number === robot.serial_number) {
        console.log("Registration request received. Responding...");
        MqttService.publishToTopic("robot/register_response", JSON.stringify({
            serial_number: robot.serial_number
        }));
    }
});

MqttService.subscribeToTopic("system/forced/fail", (message) => {
    if (message.serial_number === robot.serial_number) {
        console.log("Forced failure received. Updating status...");
        updatedStatus(statuses.Failed);
    }
});

MqttService.subscribeToTopic("system/forced/status_change", (message) => {
    if (message.serial_number === robot.serial_number) {
        console.log("Forced status change received. Updating status...");
        randomStatusChange()
    }
});

MqttService.subscribeToTopic("system/update_info", (message) => {
    if (message.serial_number === robot.serial_number) {
        if (message.new_serial_number) {
            robot.serial_number = message.new_serial_number;
            console.log("Serial number updated to: " + robot.serial_number);
        }
        if (message.status) {
            updatedStatus(robot.status);
            console.log("Status updated to: " + robot.status);
        }
        if (message.location) {
            robot.location = message.location;
            console.log("Location updated to: " + robot.location);
        }
    }
});

// Every 2-5 minutes
setInterval(randomStatusChange, Math.floor(Math.random() * (300_000 - 120_000 + 1)) + 120_000);