document.addEventListener("DOMContentLoaded", () => {
  const filterDropdown = document.getElementById("filterDropdown");
  const customDateRange = document.getElementById("customDateRange");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const applyButton = customDateRange.querySelector("button");

  let tableData;
  let summaryData;

  // Function to render sales report data into the table
  const renderTable = (data) => {
    const tbody = document.querySelector("table tbody");
    tbody.innerHTML = ""; // Clear existing table rows

    data.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = ` 
        <td>${item.date}</td>
        <td>₹${item.totalSalesRevenue.toFixed(2)}</td>
        <td>₹${item.discountApplied.toFixed(2)}</td>
        <td>₹${item.netSales.toFixed(2)}</td>
        <td>${item.numberOfOrders}</td>
        <td>${item.totalItemsSold}</td>
      `;
      tbody.appendChild(row);
    });
  };

  // Function to update the summary information
  const updateSummary = (summary) => {
    document.querySelector(
      "#totalSalesCount"
    ).textContent = `${summary.totalSalesCount} Orders`;
    document.querySelector(
      "#overallOrderAmount"
    ).textContent = `₹${summary.overallOrderAmount.toFixed(2)}`;
    document.querySelector(
      "#overallDiscount"
    ).textContent = `₹${summary.overallDiscount.toFixed(2)}`;
    summaryData = summary; // Store summary data for PDF generation
  };

  // Function to fetch sales report
  const fetchSalesReport = async (filter, startDate = "", endDate = "") => {
    try {
      const response = await fetch("/admin/sales-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filter, startDate, endDate }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (data.success) {
        tableData = data.data;
        renderTable(data.data); // Render sales report data in the table
        updateSummary(data.summary); // Update summary information
      } else {
        console.error("Error fetching sales report:", data.message);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Event listener for dropdown items
  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", function () {
      const selectedFilter = this.getAttribute("data-value");
      filterDropdown.textContent = selectedFilter;

      if (selectedFilter === "Custom Date Range") {
        customDateRange.classList.remove("d-none");
        customDateRange.classList.add("d-flex");
      } else {
        customDateRange.classList.add("d-none");
        customDateRange.classList.remove("d-flex");

        fetchSalesReport(selectedFilter);
      }
    });
  });

  // Event listener for Apply button
  applyButton.addEventListener("click", () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (startDate && endDate) {
      fetchSalesReport("Custom Date Range", startDate, endDate);
    } else {
      alert("Please select both start and end dates.");
    }
  });

  // PDF Generation using jsPDF
  const pdfButton = document.querySelector("#pdfDownload");
  pdfButton.addEventListener("click", () => {
    const { jsPDF } = window.jspdf; // Get the jsPDF constructor
    const doc = new jsPDF();

    // Add title and date
    doc.text("Sales Report", 10, 10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 10, 20);

    // Table headers
    const tableHeaders = [
      "Date",
      "Total Sales Revenue",
      "Discount Applied",
      "Net Sales",
      "Number of Orders",
      "Total Items Sold",
    ];

    // Format the table data for PDF generation
    const tableBody = tableData.map((item) => [
      item.date,
      `${item.totalSalesRevenue.toFixed(2)}`,
      `${item.discountApplied.toFixed(2)}`,
      `${item.netSales.toFixed(2)}`,
      item.numberOfOrders.toString(),
      item.totalItemsSold.toString(),
    ]);

    // Generate the table using autoTable plugin
    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 30,
    });

    // Add overall summary section
    const finalY = doc.autoTable.previous.finalY;
    doc.text("Overall Summary", 10, finalY + 10);
    doc.text(`Total Orders: ${summaryData.totalSalesCount}`, 10, finalY + 20);
    doc.text(
      `Overall Order Amount: ${summaryData.overallOrderAmount.toFixed(2)}`,
      10,
      finalY + 30
    );
    doc.text(
      `Overall Discount: ${summaryData.overallDiscount.toFixed(2)}`,
      10,
      finalY + 40
    );

    // Download the generated PDF
    doc.save("sales_report.pdf");
  });

  const excelButton = document.querySelector("#excelDownload");
  excelButton.addEventListener("click", () => {
    // Create a new workbook and a worksheet
    const wb = XLSX.utils.book_new();
    const wsData = [];

    // Add headers to the worksheet
    const headers = [
      "Date",
      "Total Sales Revenue",
      "Discount Applied",
      "Net Sales",
      "Number of Orders",
      "Total Items Sold",
    ];
    wsData.push(headers);

    // Format the data for Excel
    tableData.forEach((item) => {
      wsData.push([
        item.date,
        item.totalSalesRevenue.toFixed(2),
        item.discountApplied.toFixed(2),
        item.netSales.toFixed(2),
        item.numberOfOrders,
        item.totalItemsSold,
      ]);
    });

    // Create a worksheet from the data
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");

    // Download the workbook
    XLSX.writeFile(wb, "sales_report.xlsx");
  });
});
