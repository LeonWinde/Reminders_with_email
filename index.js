import { sendHTMLMail, sendMail } from "./mailer.js";
import { input, select, number, confirm } from "@inquirer/prompts";
import * as fs from "fs/promises";
// I could replace with a Date.now() call to use as a unique key
import { uid } from "uid";

// I regret not using ts I regret having "global" vars. However i have learned a valuable lesson out of creating this abomination of a js program
const main = async () => {
  const filename = "reminders.json";
  let reminders = [];

  // stores the current timeoutID for pausing it
  let timeoutID;

  const initialLoadReminders = async () => {
    try {
      await readReminders();
    } catch (error) {
      // This creates the file if it doesnt exist with an empty array
      if (error.code === "ENOENT") {
        await writeReminders();
      } else {
        console.error(error);
      }
    }
  };

  const sendReminder = (reminder) => {
    // console.log(reminder.text, new Date().toUTCString());
    sendMail(reminder.text).catch(console.error);
  };

  const startTimer = async () => {
    if (reminders.length === 0) return console.error("No reminders left");
    sortReminders();
    if (new Date(reminders[0].date).valueOf() < Date.now()) {
      sendReminder(reminders[0]);
      reminders.shift();
      await writeReminders();
      return startTimer();
    }
    // This can cause Issues with integers that are above 32 bit
    // I could maybe do this with setInterval instead but i don't want to change it 1 day before presentation

    return setTimeout(async () => {
      sendReminder(reminders[0]);
      reminders.shift();
      await writeReminders();
      return startTimer();
    }, new Date(reminders[0].date).valueOf() - Date.now());
  };

  // Pauses the time while it runs other functions that change the reminders array
  const pauseTimer = async (func) => {
    clearTimeout(timeoutID);
    await func();
    timeoutID = await startTimer();
  };

  // Sorts the currently loaded reminders by the date key
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
  const listReminders = (reminders) => {
    console.table(reminders, ["date", "text"]);
  };

  // Ask's 5 question to create a date 
  const getDateInput = async () => {
    const minYear = new Date().getFullYear();
    const maxYear = new Date().getFullYear() + 5;
    const year = await number({
      message: `Please enter the year: (${minYear}-${maxYear})`,
      min: minYear,
      max: maxYear,
    });
    const month = await number({
      message: "Please enter the month (As a Number between 1-12): ",
      min: 1,
      max: 12,
    });
    const day = await number({
      message: "Please enter the day: ",
      min: 1,
      max: 31,
    });
    const hour = await number({
      message: "Please enter the hour (0-23): ",
      min: 0,
      max: 23,
    });
    const minute = await number({
      message: "Please enter the minute(0-59): ",
      min: 0,
      max: 59,
    });
    // Creates a new Date using the user input. Month is subtracted by one to make input easier
    const date = new Date(year, month - 1, day, hour, minute);
    return date;
  };
  // Gets the text Message input if i ever want to add an email to my reminder object i would ask for it here
  const getMessageInput = async () => {
    return await input({ message: "Please enter the text : " });
  };

  // creates a new reminder object using text and date gotten throught user input asks for one confirmation
  const addReminder = async () => {
    const date = await getDateInput();
    const text = await getMessageInput();

    const answer = await confirm({
      message: `Would you like to create a new Reminder for ${date.toLocaleString()} with the text ${text}? `,
    });
    if (answer) {
      reminders.push({
        _id: uid(),
        date,
        text,
      });
      writeReminders();
      console.log("Added Reminder");
    }
  };

  // I could update this to use inquirer number but this works 
  const getReminderIndex = async () => {
    let index;
    do {
      index = await input({
        message:
          "Please enter the Index of the reminder that you wish to delete/update: ",
      });
    } while (Number.isNaN(Number(index)) || index === undefined);
    return index;
  };

  // uses the index function to update a reminder
  const updateReminder = async () => {
    listReminders(reminders);
    if (reminders.length === 0) {
      return;
    }

    const index = await getReminderIndex();

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

  // uses the index function to delete a reminder
  const deleteReminder = async () => {
    listReminders(reminders);
    if (reminders.length === 0) {
      return;
    }
    const index = getReminderIndex();
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

  const showDailyTodoList = async () => {
    // gets the start of today and the start of tmrw
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    //filters for reminders for the current date
    // I just found out i don't have to call the valueof() function to compare dates
    const todaysReminders = reminders.filter(
      (reminder) =>
        new Date(reminder.date) >= today && new Date(reminder.date) < tomorrow
    );
    listReminders(todaysReminders);
    if(await confirm({message:"Would you like to receive the daily tasks as an email?"})){
      await sendHTMLMail(await generateHTMLPayload(todaysReminders));
    }
    
  };

  // adds a row to the table for every reminder in reminderList and return a viable html payload 
  const generateHTMLPayload = async (reminderList) => {
    const htmlFileName = "emailLayout.html";
    let htmlContent = await fs.readFile(`${process.cwd()}/${htmlFileName}`, {
      encoding: "utf8",
    });
    reminderList.forEach((element) => {
      htmlContent = htmlContent.replace(
        "</table>",
        `<tr style="border: 1px solid black">
    <td style="padding: 5px; border: inherit">${element.text}</td>
    <td style="padding: 5px; border: inherit">${new Date(
      element.date
    ).toLocaleTimeString()}</td>
  </tr></table>`
      );
    });
    return htmlContent;
  };

  // Generates 5 reminders for the next 5 minutes
  const addTestingReminders = async () => {
    // creates an array and fills it because forEach only works if the arr elements have content
    const arr = Array(5).fill("");
    arr.forEach((el, i) => {
      const date = new Date();
      console.log(date.toLocaleDateString());
      date.setMinutes(date.getMinutes() + i + 1);
      reminders.push({
        _id: uid(),
        date,
        text: `test${i}`,
      });
      writeReminders();
    });
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
        { name: "6. Show daily tasks", value: "6" },
        { name: "7. Exit", value: "7" },
        { name: "8. Add Testing Reminders", value: "8" },
      ],
    });

    switch (choice) {
      case "1":
        listReminders(reminders);
        break;
      case "2":
        if (timeoutID) {
          await pauseTimer(addReminder);
          break;
        }
        await addReminder();
        break;
      case "3":
        if (timeoutID) {
          await pauseTimer(updateReminder);
          break;
        }
        await updateReminder();
        break;

      case "4":
        if (timeoutID) {
          await pauseTimer(deleteReminder);
          break;
        }
        await deleteReminder();
        break;
      case "5":
        if (timeoutID) {
          console.log("Timer already started!");
          break;
        }
        timeoutID = await startTimer();

        break;
      case "6":
        await showDailyTodoList();
        break;
      case "7":
        process.exit();
        break;
      case "8":
        if (timeoutID) {
          await pauseTimer(addTestingReminders);
          break;
        }

        await addTestingReminders();
        break;

      default:
        console.log(
          `${choice} is not a viable answer please answer with a number in the range of 1 to 8`
        );
        break;
    }
    showMenu();
  };
  await initialLoadReminders();
  showMenu();
};

main();
