import { Router } from 'express';
import * as util from './util';
import * as url from 'url';
import * as dns from 'dns';
import * as request from 'request';
import { ResModel, UpdateModel, TagModel } from './models';

const router = Router();

const nodes = new Set<string>();
const maxNodes = 15;
const IPv4 = /^(([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

async function getMyNode(): Promise<string> {
  return '';
}

//日付/識別子以外の形式の日付引数文字列をmongodbクエリに変換
function stampParamToQuery(stamp: string): {} {
  let reg: RegExpMatchArray | null;

  if (reg = stamp.match(/^([0-9]+)$/)) {
    return {
      stamp: +reg[1]
    };
  }

  if (reg = stamp.match(/^\-([0-9]+)$/)) {
    return {
      stamp: { $lte: +reg[1] }
    };
  }

  if (reg = stamp.match(/^([0-9]+)\-$/)) {
    return {
      stamp: { $gte: +reg[1] }
    };
  }

  if (reg = stamp.match(/^([0-9]+)\-([0-9]+)$/)) {
    return {
      stamp: { $gte: +reg[1], $lte: +reg[2] }
    };
  }

  throw new Error();
}

function filenameToTitle(filename: string): string {
  let reg = filename.match(/^thread_([A-Z0-9]+)$/i);
  if (!reg) {
    throw new Error();
  }

  return new Buffer(reg[1].toLowerCase(), 'hex').toString('utf8');
}


function TitleToFilename(title: string): string {
  return 'thread_' + new Buffer(title, 'utf8').toString('hex').toUpperCase();
}

function toIP(domain: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    dns.lookup(domain, (err, address) => {
      if (err) {
        reject(err);
      } else {
        resolve(address);
      }
    });
  });
}

function getGlobalIP(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    request.get('http://ipcheck.mycurse.net/', (err, _res, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    })
  });
}

async function NodePing(node: string): Promise<boolean> {
  let myip = await getGlobalIP();
  return new Promise<boolean>((resolve, _reject) => {
    request.get('http://' + node + '/ping', (err, _res, body) => {
      if (err) {
        resolve(false);
      } else {
        resolve(('PONG\n' + myip) === body);
      }
    })
  });
}

async function isIpEqualIpOrDomain(ipaddress: string, ipOrDomain: string): Promise<boolean> {
  let ip: string;
  if (IPv4.test(ipOrDomain)) {
    ip = ipOrDomain;
  } else {
    try {
      ip = await toIP(ipOrDomain);
    } catch (_e) {
      return false;
    }
  }

  return ip === ipaddress;
}

function randomNode(): string {
  return util.getRandomArray(Array.from(nodes))
}

router.get('/ping', (req, res) => {
  res.end('PONG\n' + req.connection.remoteAddress);
});

router.get('/node', (_req, res) => {
  if (nodes.size === 0) {
    res.end();
  } else {
    res.end(randomNode());
  }
});

router.get('/join/:node', async (req, res) => {
  if (nodes.size > maxNodes) {
    res.end();
  } else {
    let node = req.param('node').replace(/\+/g, '/');

    let hostname = url.parse("http://" + node).hostname;
    if (!hostname ||
      !isIpEqualIpOrDomain(req.connection.remoteAddress, hostname) ||
      !await NodePing(node)) {
      res.end();
      return;
    }

    if (nodes.size === 0) {
      res.end('WELCOME');
    } else {
      res.end('WELCOME\n' + randomNode());
    }

    nodes.add(node);
  }
});

router.get('/bye/:node', async (req, res) => {
  let node = req.param('node').replace(/\+/g, '/');
  if (node.indexOf(':') === 0) {
    node = req.connection.remoteAddress + node;
  }

  let hostname = url.parse("http://" + node).hostname;
  if (!hostname ||
    !isIpEqualIpOrDomain(req.connection.remoteAddress, hostname)) {
    res.end();
    return;
  }

  res.end('BYEBYE');
  nodes.delete(node);
});

router.get('/have/:filename', async (req, res) => {
  let col = await ResModel.findOne({ filename: req.param('filename') });
  if (col !== null) {
    res.end('YES');
  } else {
    res.end('NO');
  }
});

router.get('/get/:filename/:stamp', async (req, res) => {
  let reses = await ResModel.find({
    filename: req.param('filename'),
    ...stampParamToQuery(req.param('stamp'))
  });
  res.end(reses.map(x => x.raw).join('\n'));
});

router.get('/get/:filename/:stamp/:md5', async (req, res) => {
  let reses = await ResModel.find({
    filename: req.param('filename'),
    stamp: +req.param('stamp'),
    md5: req.params('md5')
  });

  res.end(reses.map(x => x.raw).join('\n'));
});

router.get('/head/:filename/:stamp', async (req, res) => {
  let reses = await ResModel.find({
    filename: req.param('filename'),
    ...stampParamToQuery(req.param('stamp'))
  });
  res.end(reses.map(x => x.stamp + '<>' + x.md5).join('\n'));
});

router.get('/head/:filename/:stamp/:md5', async (req, res) => {
  let reses = await ResModel.find({
    filename: req.param('filename'),
    stamp: +req.param('stamp'),
    md5: req.params('md5')
  });

  res.end(reses.map(x => x.stamp + '<>' + x.md5).join('\n'));
});

router.get('/update/:filename/:stamp/:md5/:node', async (req, res) => {
  res.end();

  //TODO:パラメーターのチェック
  let filename = req.param('filename');
  let stamp = +req.param('stamp');
  let md5 = req.param('md5');
  let node = req.param('node').replace(/\+/g, '/');
  if (node.indexOf(':') === 0) {
    node = req.connection.remoteAddress + node;
  }

  //ノードが不正なら何もしない
  if (!await NodePing(node)) {
    return;
  }

  //既に更新処理をしているなら何もしない
  if ((await UpdateModel.findOne({
    filename,
    md5,
    stamp
  })) !== null) {
    return;
  }

  //更新情報セーブ
  await new UpdateModel({
    stamp,
    md5,
    title: filenameToTitle(filename),
    filename
  }).save();

  //取得
  await new Promise((resolve, reject) => {
    request.get(`${node}/get/${filename}/${stamp}/${md5}`, (err, _res, body) => {
      if (err) {
        reject(err);
        return;
      }


    });
  });


  //他ノードに通知
  for (let n of nodes) {
    let url = `http://${n}/update/${filename}/${stamp}/${md5}/${(await getMyNode()).replace(/\//g, '+')}`;
    //送った後待機はしない
    request.get(url);
  }
});

router.get('/', (_req, res) => {
  res.end('n-getsu\nhttps://github.com/kgtkr/n-getsu');
});