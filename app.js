let crawlerjs = require('crawler-js'),
    jsdom = require("jsdom"),
    fs = require('fs');

const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;

let $ = require('jquery')(window),
    newsDir = 'news/',
    newArticlesDir = 'news/waiting/',
    sendedArticlesDir = 'news/sended/',
    resultsArticlesDir = 'news/results/',
    logFile = 'crawler.log',
    newsToGet = [],
    newsUrl = [],
    newsToAnalyse = [];

global.document = document;

const urlWatson = 'https://gateway.watsonplatform.net/natural-language-understanding/api',
      userName = '${username}',
      pass = '${password}';

var watsonAPI = require('watson-developer-cloud/natural-language-understanding/v1.js');
var watson = new watsonAPI({
    version: '2018-11-25',
    username: `${userName}`,
    password: `${pass}`,
    url: `${urlWatson}`
});


let log = (content) => {
    let dateNow = new Date(),
        day = dateNow.getDate(),
        month = dateNow.getMonth(),
        year = dateNow.getFullYear(),
        logMessage = '';

    logMessage = `Logando em: ${day}/${month}/${year} ${dateNow.getHours()}:${dateNow.getMinutes()}> \n`;
    logMessage += content + '\n';
    logMessage += 'Fim do Log... >';

    fs.appendFile(logFile, logMessage, 'utf8', function(err){ });
};

let getFilesFromPath = (path, extension) => {
    let dir = fs.readdirSync( path );
    return dir.filter( elm => elm.match(new RegExp(`.*\.(${extension})`, 'ig')));
};

let getNewsUrl = () => {
    console.log("Checando se existem novas notícias para adquirir.");
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
    setTimeout(getUrlCallback, 20000);
};

let getUrlCallback = () => {
    console.log("Checagem por novas url de notícia completo!");
    console.log('Verificando urls duplicadas na coleção. Tamanho da Coleção de Urls: '+ newsUrl.length);

    let currentUrls = [], delletions = 0;
    newsUrl.forEach(function(news) {
        let existInNewsUrl = false;
        if(newsToGet.length > 0) {
            newsToGet.forEach(function(notice){
                if(fs.existsSync(newArticlesDir + notice.name + '.txt') ||
                   fs.existsSync(sendedArticlesDir + notice.name + '.txt') ||
                   notice.id === news.id) {

                    delletions++;
                    existInNewsUrl = true;
                }
            });
        } else {
            if(fs.existsSync(newArticlesDir + news.name + '.txt') || fs.existsSync(sendedArticlesDir + news.name + '.txt')) {
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
    console.log('Verificação de duplicidade. Finalizada!');
    console.log("Obtivemos "+ newsUrl.length + " urls adicionadas and "+ delletions+ " removidas.");
    newsUrl = [];
    verifyNewsContent();
};

let verifyNewsContent = () => {
    normalizeNewsToAnalyze();
    console.log("Verificando coleção de aquisição.");

    if(newsToGet.length > 0) {
        console.log(`${newsToGet.length} urls de aquisição encontradas. Iniciando processo extração.`);
        setTimeout(getNews, 1000);
    } else if(newsToAnalyse.length > 0) {
        console.log(`${newsToAnalyse.length} notícias aguardando por análise. Iniciando envio para análise.`);
        setTimeout(analyzeFileWatson, 1000);
    } else {
        console.log("Não existem notícias para extrair na coleção. Configurando próxima verificação para 60s.");
        setTimeout(getNewsUrl, 60000);
    }
};

let getNews = () => {
    if(newsToGet.length > 0) {
        console.log("Iniciando processo de aquisição. Tamanho da fila: "+ newsToGet.length);
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
                        console.log('Extraindo: '+ currentNoticeConfig.url);
                        let articleText = '',
                            fileName = newArticlesDir + currentNoticeConfig.name + '.txt';
                        if(!err) {
                            console.log('Extraindo conteúdo da página.');
                            if(html.find('p').length > 0) {
                                articleText = $.trim(html.find('p').text());
                            } else {
                                articleText = $.trim(html.text());
                            }

                            if(articleText !== '') {
                                fs.writeFile(fileName, articleText, 'utf8', function(err){
                                   if(err) {
                                       console.log(`Erro ao tentar escrever arquivo da notícia: ${err}`);
                                       log(`Erro ao tentar escrever arquivo da notícia: ${err}`);
                                       preHandleDecision();
                                   } else {
                                       newsToAnalyse.push(fileName);
                                       console.log(`Notícia ${fileName} extraída com sucesso!`);
                                       preHandleDecision();
                                   }
                                });
                            } else {
                                console.log('Texto de extração estava vazio. Ignorando notícia.');
                                preHandleDecision();
                            }
                        } else {
                            console.log(`Erro ao tentar acessar a notícia para extração: ${err}`);
                            preHandleDecision();
                        }
                    }
                }
            ]
        });

    } else {
        preHandleDecision();
    }
};

let preHandleDecision = () => {
    if(newsToGet.length <= 0)
        handleNextStep();
    else
        handleNextStep(false);
};

let normalizeNewsToAnalyze = () => {
    let filesWaiting = getFilesFromPath( newArticlesDir, '.txt');
    filesWaiting.forEach(function(file){
       let filename = newArticlesDir + file;
       if(newsToAnalyse.indexOf(filename) === -1) {
           newsToAnalyse.push(filename);
       }
    });
};

let handleNextStep = (doneGettingNews = true) => {
    if(!doneGettingNews) {
        console.log('Próxima extração em 5s.');
        setTimeout(getNews, 5000);
        return;
    }

    normalizeNewsToAnalyze();
    if(newsToAnalyse.length > 0) {
        console.log(`Diretório de novas notícias contém ${newsToAnalyse.length} artigos para enviar para análise.`);
        analyzeFileWatson();
    } else {
        console.log('Não há mais notícias para extrair ou analisar. Próxima verificação de urls ocorre em 60s.');
        setTimeout(getNewsUrl, 60000);
    }
};

let analyzeFileWatson = () => {
    if(newsToAnalyse.length > 0) {
        console.log(`Enviando arquivos para a Rede Neural. Arquivos na fila: ${newsToAnalyse.length}`);

        let currentFile = newsToAnalyse.pop(),
            text = fs.readFileSync(currentFile, 'utf8');


        if (text === '') {
            console.log('Erro: Arquivo vazio!');
            log('Erro: Arquivo vazio!');
            fs.unlinkSync(file);
            return;
        }

        let parameters = {
            'text': text,
            'features': {
                'entities': {},
                'keywords': {}
            }
        };

        console.log('Enviando: ' + currentFile);
        watson.analyze(parameters, function (err, response) {
            if (err) {
                console.log(`Erro ao tentar enviar o arquivo ${currentFile} para análise: ${err}`);
                log(`Erro ao tentar enviar o arquivo ${currentFile} para análise: ${err}`);
            } else {
                let articleID = currentFile.split('-').pop();
                articleID = articleID.replace('.txt', '.json');
                fs.writeFile(resultsArticlesDir + articleID, JSON.stringify(response), 'utf8', function(err) {
                    if(err) {
                        console.log('Erro ocorrido ao tentar gravar o arquivo json: ' + currentFile);
                        log('Erro ocorrido ao tentar gravar o arquivo json: ' + currentFile);
                    } else {
                        fs.rename(currentFile, sendedArticlesDir + currentFile.split('/').pop(), function(err) {
                            if(!err) {
                                console.log('Arquivo de resultados do envio escrito com sucesso.');
                                handleNextStep();
                            } else {
                                console.log('Erro ao tentar mover o arquivo da notícia processada para o diretório de enviadas: ' + err);
                                log(`Erro ao tentar mover o arquivo da notícia processada para o diretório de enviadas. Arquivo:  ${currentFile} - ${err}`);
                                handleNextStep();
                            }
                        });
                    }
                });
            }
        });

    } else {
        handleNextStep();
    }
};



getNewsUrl();