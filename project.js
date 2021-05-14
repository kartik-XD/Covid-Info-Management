const puppeteer = require('puppeteer');
const json2xls = require('json2xls');// to convert .json file to .xlsx file
const fs = require('fs');
const email=process.argv[2];
const mye="";
const mypass="";

const scrape = async () => {
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"],
        slowMo:100,
    }); //browser initiate
    const page = await browser.newPage();  // opening a new blank page
    await page.goto('https://en.wikipedia.org/wiki/2019%E2%80%9320_coronavirus_pandemic_by_country_and_territory', { waitUntil: 'domcontentloaded' }) // navigate to url and wait until page loads completely

    // Selected table by aria-label instead of div id
    const recordList = await page.$$eval('[aria-label="COVID-19 pandemic by country and territory table"] table#thetable tbody tr', (trows) => {
        let rowList = []
        trows.forEach(row => {
            let record = { 'country': '', 'cases': '', 'death': '', 'recovered': '' }
            record.country = row.querySelector('a').innerText; // (tr < th < a) anchor tag text contains country name
            const tdList = Array.from(row.querySelectorAll('td'), column => column.innerText); // getting textvalue of each column of a row and adding them to a list.
            record.cases = tdList[0];
            record.death = tdList[1];
            record.recovered = tdList[2];
            if (tdList.length >= 3) {
                rowList.push(record)
            }
        });
        return rowList;
    })

    const page2 = await browser.newPage();
    await page2.goto('https://en.wikipedia.org/wiki/Deployment_of_COVID-19_vaccines', { waitUntil: 'domcontentloaded' })
    const recordlist2 = await page2.$$eval('[aria-label="COVID-19 vaccinations by country"] table#thetable tbody tr', (trows) => {
        let rowList2 = []
        trows.forEach(row => {
            let record2 = { 'country': '', 'vaccinated': '', 'perc_population': '' }
            if (row.querySelector('a') == null) {
                record2.country = "World"
            } else {
                record2.country = row.querySelector('a').innerText;
            }
            const tdList2 = Array.from(row.querySelectorAll('td'), column => column.innerText);
            record2.vaccinated = tdList2[1];
            record2.perc_population = tdList2[2];
            if (tdList2.length >= 2) {
                rowList2.push(record2)
            }

        });
        return rowList2;
    })
    browser.close();

    // Store output

    fs.writeFile('covid19.json', JSON.stringify(recordList, null, 2), (err) => {
        if (err) { console.log(err) }
        else { console.log('Saved Successfully!') }
    })

    setTimeout(() => {

        const filename = require('./covid19.json')
        var xls = json2xls(filename);
        fs.writeFileSync('data.xlsx', xls, 'binary'); // conversion of .json file to .xlsx file

    }, 5000);


    fs.writeFile('covid19vaccinated.json', JSON.stringify(recordlist2, null, 2), (err) => {
        if (err) { console.log(err) }
        else { console.log('Saved Successfully!') }
    })

    setTimeout(() => {

        const filename = require('./covid19vaccinated.json')
        var xls = json2xls(filename);
        fs.writeFileSync('vaccinated.xlsx', xls, 'binary');

    }, 5000);

};

// mail the excel files to user email address
const mail = async () => {

    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"],
        slowMo: 30,
    }); //browser initiate
    const page = await browser.newPage();
    let gmail_url = "https://www.gmail.com";
    await page.goto(gmail_url);
    await page.type("input[type='email']",mye);
    await page.keyboard.press("Enter");
    await page.waitForNavigation();
    await page.waitForSelector("input[name='password']", { visible: true });
    await page.type("input[name='password']", mypass);
    await page.keyboard.press("Enter");
    await page.waitForNavigation();
    let compose_url = "https://mail.google.com/mail/u/0/#inbox?compose=new";
    await page.goto(compose_url);

    // enter email of recipient in the "to" section.
    await page.waitForSelector('textarea[name="to"]', { visible: true });
    await page.type('textarea[name="to"]', email);
    await page.keyboard.press("Enter");

    // press tab twice to get to message body.
    await page.keyboard.press("Tab");
    await page.waitForSelector('[name="subjectbox"]',{visible:true});
    await page.type('[name="subjectbox"]',"covid info")
    await page.keyboard.press("Tab");


    // goto text area and enter text to be sent.
    await page.waitForSelector(".Am.Al.editable.LW-avf.tS-tW",{visible: true});
    await page.type(".Am.Al.editable.LW-avf.tS-tW", "Hi, please find the attached files");

    //goto attachments
        const [fileChoose] = await Promise.all([
            page.waitForFileChooser(),
            page.click('.a1.aaA.aMZ')
        ])
        await page.waitForTimeout(4000);

        await fileChoose.accept(['./data.xlsx']);
    
        await page.waitForTimeout(4000);
    
        await page.waitForSelector('.a1.aaA.aMZ', { visible: true });
        const [fileChoose2] = await Promise.all([
            page.waitForFileChooser(),
            page.click('.a1.aaA.aMZ')
        ])
    
        await page.waitForTimeout(4000);
    
        await fileChoose2.accept(['./vaccinated.xlsx']);

        await page.waitForTimeout(4000);

    await page.click('.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3');// to click on send button
    await page.waitForTimeout(4000);
    await browser.close();

    await console.log("Daily Report sent succefully");

};

async function cb() {
    await scrape();
    await setTimeout(() => {
        mail();
    }, 8000);

};
cb(); // calling function



