import { sendMail } from "./mailer.js";
import { input, select } from "@inquirer/prompts";
import * as fs from "fs/promises";
import { uid } from "uid";

const main = async () => {
  const filename = "reminders.json";
  let reminders = [];

  let timoutID;
  const sendReminder = (reminder) => {
    console.log(reminder.text, new Date().toUTCString());
    // sendMail(reminder.text).catch(console.error)
  };
  const startTimer = async () => {
    await readReminders();
    if (reminders.length === 0) return console.error("No reminders left");
    sortReminders();
    console.log(Date.now() - new Date(reminders[0].date).valueOf());
    if (new Date(reminders[0].date).valueOf() < Date.now()) {
      console.log(reminders[0]);
      reminders.shift();
      writeReminders();
      return startTimer();
    }
    return setTimeout(() => {
      console.log(reminders[0]);
      reminders.shift();
      writeReminders();
      return startTimer();
    }, new Date(reminders[0].date).valueOf() - Date.now());
  };

  const sortReminders = () => {
    reminders = reminders.sort(
      (a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf()
    );
  };

  const readReminders = async () => {
    try {
      const data = await fs.readFile(`${process.cwd()}/${filename}`, {
        encoding: "utf8",
      });
      reminders = await JSON.parse(data);
      console.log(reminders);
    } catch (error) {
      console.error(error.message);
    }
  };
  const writeReminders = async () => {
    try {
      const textReminders = JSON.stringify(reminders);
      await fs.writeFile(`${process.cwd()}/${filename}`, textReminders);
    } catch (err) {
      console.log(err);
    }
  };
  const listReminders = async () => {
    if (reminders) await readReminders();
    console.table(reminders, ["date", "text"]);
  };

  const getDateInput = async () => {
    const year = await input({ message: "Please enter the year: " });
    const month = await input({ message: "Please enter the month: " });
    const day = await input({ message: "Please enter the day: " });
    const hour = await input({ message: "Please enter the hour: " });
    const minute = await input({ message: "Please enter the minute: " });
    const date = new Date(year, month, day, hour, minute);
    return date;
  };
  const getMessageInput = async () => {
    return await input({ message: "Please enter the text : " });
  };
  const addReminder = async () => {
    const date = await getDateInput();
    const text = await getMessageInput();
    try {
      console.log(
        `Would you like to create a new Reminder for ${date.toLocaleString()} with the text ${text}? `
      );
    } catch (error) {
      console.error(error);
    }
    reminders.push({
      _id: uid(),
      date,
      text,
    });
    writeReminders();
  };
  const getIndex = async () => {
    let index;
    do {
      index = await input({
        message:
          "Please enter the Index of the reminder that you wish to update: ",
      });
    } while (Number.isNaN(Number(index)) || index === undefined);
    return index;
  };

  const updateReminder = async () => {
    await listReminders();
    if (reminders.length === 0) {
      return;
    }

    const index = await getIndex();

    const updateText = await input({
      message: "Would you like to update the text? (y/n) ",
    });
    if (updateText.toLowerCase() === "y") {
      reminders[Number(index)].text = await getMessageInput();
    }

    const updateDate = await input({
      message: "Would you like to update the Date? (y/n) ",
    });
    if (updateDate.toLowerCase() === "y") {
      reminders[Number(index)].date = await getDateInput();
    }
    writeReminders();
  };

  const deleteReminders = async () => {
    await listReminders();
    if (reminders.length === 0) {
      return;
    }
    const index = getIndex();
    const deleteConfirm = await input({
      message: "Are you sure? (y/n) ",
    });
    if (deleteConfirm.toLowerCase() === "y") {
      reminders = reminders.filter(
        (reminder) => reminder._id !== reminders[Number(index)]._id
      );
    }
    writeReminders();
  };

  const showMenu = async () => {
    console.log("Welcome");
    const choice = await select({
      message: "What would you like to do?",
      choices: [
        { name: "1. Show reminders", value: "1" },
        { name: "2. Add a reminder", value: "2" },
        { name: "3. Update a reminder", value: "3" },
        { name: "4. Delete a reminder", value: "4" },
        { name: "5. Start timer", value: "5" },
        { name: "6. Exit", value: "6" },
      ],
    });

    switch (choice) {
      case "1":
        listReminders();
        break;
      case "2":
        await addReminder();
        break;
      case "3":
        await updateReminder();
        break;

      case "4":
        await deleteReminders();
        break;
      case "5":
        startTimer();
        break;
      case "6":
        process.exit();
        break;

      default:
        console.log(
          `${choice} is not a viable answer please answer with a number in the range of 1 to 5`
        );
        break;
    }
    showMenu();
  };

  showMenu();
};

main();
