document.getElementById("xlsx-file").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (!file) {
        alert("No file selected.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(worksheet);
        
        document.getElementById("output").innerHTML = html;
    };

    reader.readAsArrayBuffer(file);
});
