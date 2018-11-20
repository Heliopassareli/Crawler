var crawlerjs = require('crawler-js');
var jsdom = require("jsdom");
var fs = require('fs');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;

global.document = document;
var $ = require('jquery')(window);
var newsDir = 'news/',
    logFile = 'crawler.log';

let newsToGet = [],
    newsUrl = [];

let log = (content) => {
    let dateNow = new Date(),
        day = dateNow.getDate(),
        month = dateNow.getMonth(),
        year = dateNow.getFullYear(),
        logMessage = '';

    logMessage = `<${day}/${month}/${year} ${dateNow.getHours()}:${dateNow.getMinutes()} \n`;
    logMessage += content + '\n';
    logMessage += 'Log end... >';

    fs.appendFile(logFile, logMessage, 'utf8', function(err){ });
};

let getNewsUrl = () => {
    console.log("Crawling to get New's Urls. ");
    crawlerjs({
        interval: 1000,
        getSample: 'https://br.investing.com/news/forex-news/',
        get: 'https://br.investing.com/news/forex-news/',
        preview: 0,
        extractors: [
            {
                selector: '#leftColumn .largeTitle article > a',
                callback: function(err,html,url,response) {
                    if(!err) {
                        $.each(html, function(i, item){
                            let newsCollection = {},
                                link = 'https://br.investing.com',
                                fileName = item.attribs.href;

                            newsCollection.id = item.parent.attribs['data-id'];
                            newsCollection.name = fileName.split('/')[3];
                            newsCollection.url = link + item.attribs.href;
                            newsUrl.push(newsCollection);
                        });

                     }else {
                        console.log(err);
                    }
                }
            }
        ]
    });
    setTimeout(getUrlCallback, 5000);
};

let getUrlCallback = () => {
    console.log("Crawling to get New's Urls. done!");
    console.log('Searching for duplicated urls in collection.');

    let currentUrls = [], delletions = 0;
    newsUrl.forEach(function(news) {
        let existInNewsUrl = false;
        if(newsToGet.length > 0) {
            newsToGet.forEach(function(notice){
                if(fs.existsSync(newsDir + notice.name + '.txt') || notice.id === news.id) {
                    delletions++;
                    existInNewsUrl = true;
                }
            });
        } else {
            if(fs.existsSync(newsDir + news.name + '.txt')) {
                delletions++;
                existInNewsUrl = true;
            }
        }
        if(!existInNewsUrl) currentUrls.push(news);
    });

    newsUrl = currentUrls;

    if(newsUrl.length > 0) {
        newsUrl.forEach(function(notice) {
            newsToGet.push(notice);
        });
    }
    console.log('Searching for duplicated urls in collection. done!');
    console.log("We've got "+ newsUrl.length + " added and "+ delletions+ " ignored.");
    newsUrl = [];
    verifyNewsContent();
};

let verifyNewsContent = () => {
    console.log("Verifying NewsToGet collection. ");
    if(newsToGet.length > 0) {
        console.log("We have "+ newsToGet.length +" news to get.");
        setTimeout(getNews, 500);
    } else {
        console.log("We have no news to get. Configuring new check in 60s.");
        setTimeout(getNewsUrl, 60000);
    }
};

let getNews = () => {
    if(newsToGet.length > 0) {
        console.log("Starting queue process to get the actual notice. Queue amount: "+ newsToGet.length);
        let currentNoticeConfig = newsToGet[newsToGet.length - 1];
        newsToGet.pop();
        crawlerjs({
            interval: 1000,
            getSample: currentNoticeConfig.url,
            get: currentNoticeConfig.url,
            preview: 0,
            extractors: [
                {
                    selector: '#leftColumn .articlePage',
                    callback: function(err,html,url,response) {
                        console.log('Crawling: '+ currentNoticeConfig.url);
                        let articleText = '',
                            fileName = newsDir + currentNoticeConfig.name + '.txt';
                        if(!err) {
                            console.log('Getting page content...');
                            if(html.find('p').length > 0) {
                                console.log('Element p found...');
                                articleText = $.trim(html.find('p').text());
                            } else {
                                console.log('Element p not found...');
                                articleText = $.trim(html.text());
                            }

                            if(articleText !== '') {
                                fs.writeFile(fileName, articleText, 'utf8', function(err){
                                   if(err) {
                                       newsToGet.push(currentNoticeConfig);
                                       console.log(`Error trying to write notice file: ${err}`);
                                       console.log('Current notice pushed to NewsToGet ... Ok');
                                   } else {
                                       console.log(`Notice ${fileName} successfully acquired!`);
                                   }

                                    handleNextStep(true);
                                });
                            } else {
                                newsToGet.push(currentNoticeConfig);
                                console.log('Variable articleText was empty. Pushing back current noticeConfig...');
                                handleNextStep();
                            }
                        }else {
                            newsToGet.push(currentNoticeConfig);
                            console.log(`Error trying to access notice: ${err}`);
                            console.log('Current notice pushed to NewsToGet ... Ok');
                            handleNextStep();
                        }
                    }
                }
            ]
        });

    } else {
        console.log("We have no news to get. Configuring new check in 10s.");
        handleNextStep();
    }
};

let handleNextStep = (finishGettingNews = false) => {
    if(newsToGet.length > 0) {
        console.log('Next notice extract occurs in 10s');
        setTimeout(getNews, 10000);
    } else {
        console.log('No else news to get. Configuring next news verification for 60 from now on.');
        setTimeout(getNewsUrl, 60000);
    }
};

getNewsUrl();