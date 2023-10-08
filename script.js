document.getElementById("downloadButton").addEventListener("click", function () {
    const contestId = document.getElementById("contestId").value;
    const searchToken = document.getElementById("searchToken").value;
    const CSVField = document.getElementById("csv-file").files[0];
    handler([contestId, searchToken, CSVField]);
});

let generated = false;    

class Participant {
    constructor(codeforcesId, score) {
        this.codeforcesId = codeforcesId;
        this.score = score;
        this.rank = 0;
    }

    setScore(score) {
        this.score = score;
    }

    getCodeforcesId() {
        return this.codeforcesId;
    }

    getScore() {
        return this.score;
    }

    getRank() {
        return this.rank;
    }

    setRank(rank) {
        this.rank = rank;
    }
}

async function downloadLeaderboard(contestId, searchToken) {
    // remove spaces from contestId
    contestId = contestId.replace(" ", "");
    // define the URL
    const url = `https://codeforces.com/api/contest.standings?contestId=${contestId}&showUnofficial=false`;
    let rows = null;
    try {
        const response = await fetch(url, {mode: "cors"});
        if (!response.ok) {
            alert("ContestID Does Not Exist!");
            return [];
        }
        // read the response as json
        const jsonObject = await response.json();
        // get the result attribute
        const status = jsonObject.status;
        if (status === "OK") {
            rows = jsonObject.result.rows;
        }
    } catch (e) {
        alert("No Internet OR Invalid Contest ID!");
        return [];
    }
    const standings = rows;
    // create a list of participants
    let handlePointsList = [];
    try {
        // check if the excel sheet is valid
        const len = standings != null ? standings.length : 0;
        const splitter = searchToken.replace(" ", "").split(",");
        if (splitter.length === 0 && splitter[0] === "") {
            throw new Error("WTH");
        }
        if (standings != null) {
            for (let i = 0; i < len; i++) {
                const row = standings[i];
                const party = row.party;
                const members = party.members;
                for (let j = 0; j < members.length; j++) {
                    const member = members[j];
                    const handle = member.handle;
                    const points = row.points;
                    for (const chk of splitter) {
                        if (handle.toLowerCase().includes(chk.toLowerCase())) {
                            console.log(handle, points);
                            handlePointsList.push({ codeforcesId: handle, score: points });
                            break;
                        }
                    }
                }
            }
        } else {
            alert("InvalidContestNumber, No Participants!");
        }
    } catch (e) {
        alert("Invalid Excel Sheet Format! There be Rank, Id and Score Columns!");
    }
    generated = true;
    return handlePointsList;
}

function filterLeaderboard(leaderboard) {
    let arr = [];
    let hs = new Set();
    for (let k of leaderboard) {
        console.log(k);
        // if hs doesn't have the codeforcesId, add it to the array
        if (!hs.has(k.codeforcesId)) {
            y = new Participant(k.codeforcesId, k.score);
            if (y.score <= 9) {
                y.score *= 1000;
            }
            arr.push(y);
            hs.add(k.codeforcesId);
        }
    }
    return arr; // Placeholder
}

function loadCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const lines = reader.result.split('\n');
            let participants = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].split(',');
                participants.push(new Participant(line[1], parseInt(line[2])));
            }
            resolve(participants);
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsText(file);
    });
}

function mergeLeaderboards(currentLeaderboard, previousLeaderboard) {
    let mergedLeaderboard = [];

    // Add all participants from current leaderboard to merged leaderboard
    mergedLeaderboard.push(...currentLeaderboard);

    // Loop through participants in previous leaderboard
    for (let previousParticipant of previousLeaderboard) {
        let found = false;

        // Loop through participants in current leaderboard
        for (let currentParticipant of currentLeaderboard) {
            // If codeforces_Id matches, add scores and mark as found
            if (currentParticipant.codeforcesId == previousParticipant.codeforcesId) {
                currentParticipant.setScore(currentParticipant.score + previousParticipant.score);
                found = true;
                break;
            }
        }

        // If participant not found in current leaderboard, add to merged leaderboard with score as 0
        if (!found) {
            let newParticipant = new Participant(previousParticipant.codeforcesId, previousParticipant.score);
            mergedLeaderboard.push(newParticipant);
        }
    }

    return mergedLeaderboard;
}

function sortLeaderboard(leaderboard) {
    try {
        leaderboard.sort((p1, p2) => p2.score - p1.score);
    } catch (e) {
        console.log("error at sortLeaderboard");
        console.error("Invalid Input/Contest_ID Does Not Exist!");
    }
}

function assignRanks(leaderboard) {
    try {
        for (let i = 0; i < leaderboard.length; i++) {
            leaderboard[i].rank = i + 1;
        }
    } catch (e) {
        console.log("error at assignRanks");
        console.error("Invalid Input/Contest_ID Does Not Exist!");
    }
}

function exportParticipantsToCSV(participants) {
    // Create a CSV string
    let csv = "Rank,Codeforces_ID,Score\n";
    for (let i = 0; i < participants.length; i++) {
        let participant = participants[i];
        csv += `${participant.rank},${participant.codeforcesId},${participant.score}\n`;
    }

    // Create a Blob object from the CSV string
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    // Create a link element to download the CSV file
    let link = document.createElement("a");
    if (link.download !== undefined) {
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "CurrentCodeforcesLeaderboard.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

async function handler(args){
    if (args == null) {
        alert("No Input!");
        return;
    }

    // Set loading screen css dsiplay to flex   
    const loadingScreen = document.getElementById("loadingScreen");
    loadingScreen.style.display = "flex";
    loadingScreen.style.justifyContent = "center";
    loadingScreen.style.alignItems = "center";

    // Hide the container class
    const container = document.getElementsByClassName("container");
    container[0].style.display = "none";

    // Start loading screen
    showLoadingScreen();

    const contestId = args[0];
    const searchToken = args[1];
    const CSVField = args[2];

    currentLeaderboard = [];

    // split contestId by comma
    let contestIds = contestId.split(",");
    
    // start a loop for each contestId
    for(let i = 0; i < contestIds.length; i++) {

        // check if contestId is empty
        if (contestIds[i] === "") {
            console.error("Invalid Input, Contest_ID Cannot Be Empty!");
        }

        const currentContestId = contestIds[i];

        // Update the loading screen to display the current contestId
        updateLoadingScreen(currentContestId, contestIds, i);

        // try downloading the leaderboard
        let leaderboard = await downloadLeaderboard(contestIds[i], searchToken);
        // output the leaderboard
        console.log(leaderboard);
        // wait until leaderboard value is assigned before running the if statement
        if (currentLeaderboard.length === 0) {
            console.log("filtering leaderboard");
            currentLeaderboard = await filterLeaderboard(leaderboard);
        } else {
            console.log("merging leaderboards");
            currentLeaderboard = await mergeLeaderboards(filterLeaderboard(leaderboard), currentLeaderboard);
        }
    }

    // load previous CSV file if it exists
    if (CSVField != null) {
        console.log("loading previous CSV file");
        let previousParticipants = await loadCSVFile(CSVField);
        console.log(previousParticipants);
        console.log("merging leaderboards with previous CSV file");
        currentLeaderboard = await mergeLeaderboards(currentLeaderboard, previousParticipants);
        console.log("CSV merged leaderboard");
        console.log(currentLeaderboard);
    }

    // sort the leaderboard
    console.log("sorting leaderboard");
    await sortLeaderboard(currentLeaderboard);

    // assign ranks to participants
    console.log("assigning ranks");
    await assignRanks(currentLeaderboard);

    hideLoadingScreen();
    
    if(confirm("Do you want to download the leaderboard?")){
        // export participants to CSV
        console.log("exporting participants to CSV");
        await exportParticipantsToCSV(currentLeaderboard);

        // alert success
        alert("Successfully Downloaded Leaderboard!");
    }

    // Write all the participants to the output div
    const output = document.getElementById("leaderboard");
    output.innerHTML = "<h2>Leaderboard</h2>";

    for(let i = 0; i < currentLeaderboard.length; i++) {
        const participant = document.createElement("div");
        participant.textContent = `${currentLeaderboard[i].rank}. ${currentLeaderboard[i].codeforcesId} - ${currentLeaderboard[i].score}`;
        output.appendChild(participant);
    }

    // Show the container class
    container[0].style.display = "block";

    // set generated to true
    generated = true;
}


function showLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    loadingScreen.style.display = "block";
}

function updateLoadingScreen(currentContestId, contestIds, i) {
    const currentContestIdElement = document.getElementById("currentContestId");
    currentContestIdElement.textContent = currentContestId;

    // Update the progress bar (you can adjust the value accordingly)
    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = ((i + 1) / contestIds.length) * 100 + "%";

    // if i is the last contestId, then hide the progress bar
    if (i === contestIds.length - 1) {
        updateLoadingScreenMessage("Generating Leaderboard...");
    }
}

function updateLoadingScreenMessage(message) {
    const loadingScreenMessage = document.getElementById("loadingText");
    loadingScreenMessage.textContent = message;
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    loadingScreen.style.display = "none";
}
