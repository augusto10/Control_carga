import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

// Inicialização do Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';
const COOKIE_NAME = 'auth_token';
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;

// Configurações de CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

// Expressão regular para validação de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tipos
interface LoginRequest extends NextApiRequest {
  body: {
    email: string;
    senha: string;
  };
}

// Middleware para habilitar CORS
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  // Aplicar headers CORS
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Se for uma requisição OPTIONS, retornar imediatamente
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  };
}

// Função para verificar se um IP está em uma faixa CIDR
const isInRange = (ip: string, cidr: string): boolean => {
  try {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~(Math.pow(2, (32 - parseInt(bits, 10))) - 1) >>> 0;
    
    const ip2long = (ip: string): number => {
      return ip.split('.').reduce((acc, octet, index) => {
        return acc + (parseInt(octet, 10) << (8 * (3 - index)));
      }, 0) >>> 0;
    };
    
    const ipLong = ip2long(ip);
    const rangeLong = ip2long(range);
    
    return (ipLong & mask) === (rangeLong & mask);
  } catch (e) {
    return false;
  }
};

const handler = async (
  req: LoginRequest,
  res: NextApiResponse
) => {
  // Log da requisição (sem incluir dados sensíveis)
  console.log('[API] Nova requisição para /api/auth/login');
  console.log('[API] Método:', req.method);
  console.log('[API] Headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent'],
    origin: req.headers['origin']
  });
  
  // Aplicar headers CORS
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Verificar método HTTP
  if (req.method !== 'POST') {
    const errorMessage = `Método ${req.method} não permitido`;
    console.log(`[API] Erro: ${errorMessage}`);
    
    return res.status(405).json({ 
      success: false,
      message: errorMessage 
    });
  }
  
  // Validar corpo da requisição
  if (!req.body) {
    const errorMessage = 'Corpo da requisição inválido';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage
    });
  }

  // Extrair e validar email e senha
  const { email: rawEmail, senha } = req.body;
  
  // Validar presença dos campos obrigatórios
  if (!rawEmail || !senha) {
    const errorMessage = 'E-mail e senha são obrigatórios';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'MISSING_FIELDS'
    });
  }
  
  // Normalizar e validar email
  const email = String(rawEmail).trim().toLowerCase();
  
  // Verificar se o email não está vazio após o trim
  if (!email) {
    const errorMessage = 'O e-mail não pode estar vazio';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'EMPTY_EMAIL'
    });
  }

  // Verificar comprimento do email
  if (email.length > MAX_EMAIL_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `O email não pode ter mais de ${MAX_EMAIL_LENGTH} caracteres`,
      code: 'EMAIL_TOO_LONG'
    });
  }
  
  // Verificar se o email tem formato válido
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Formato de email inválido',
      code: 'INVALID_EMAIL_FORMAT'
    });
  }
  
  // Extrair e validar domínio do email
  const domain = email.split('@')[1];
  
  // Verificar se o domínio existe
  if (!domain) {
    return res.status(400).json({
      success: false,
      message: 'Domínio de email inválido',
      code: 'INVALID_EMAIL_DOMAIN'
    });
  }
  
  // Verificar formato básico do domínio (deve ter pelo menos um ponto)
  if (!domain.includes('.')) {
    return res.status(400).json({
      success: false,
      message: 'Domínio de email inválido',
      code: 'INVALID_EMAIL_DOMAIN'
    });
  }
  
  // Verificar domínios locais básicos
  const localDomains = ['localhost', 'local', '127.0.0.1', '::1'];
  if (localDomains.includes(domain.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Domínio de email não permitido',
      code: 'INVALID_EMAIL_DOMAIN'
    });
  }
      message: errorMessage,
      code: 'RESERVED_DOMAIN',
      domain: domain
    });
  }
  
  // Validação da senha
  if (!senha || typeof senha !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Senha é obrigatória',
      code: 'PASSWORD_REQUIRED'
    });
  }
  
  // Verificar comprimento mínimo da senha
  if (senha.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
      code: 'PASSWORD_TOO_SHORT'
    });
  }
  
  // Verificar complexidade da senha (opcional, descomente se necessário)
  /*
  if (!passwordRegex.test(senha)) {
    return res.status(400).json({
      success: false,
      message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
      code: 'WEAK_PASSWORD'
    });
  }
  */
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Limite para colunas de email
  
  // Extrair domínio do email para validação adicional
  const domain = email.split('@')[1];
  
  // Verificar se o domínio é um endereço IP
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipRegex.test(domain)) {
    const errorMessage = 'Endereços de email com domínio IP não são permitidos';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_EMAIL_DOMAIN'
    });
  }
  
  // Lista de domínios de email temporários/bloqueados (exemplo)
  const blockedDomains = [
    'tempr.email',
    'mailinator.com',
    'guerrillamail.com',
    'yopmail.com',
    'temp-mail.org',
    'dispostable.com',
    'maildrop.cc',
    '10minutemail.com',
    'trashmail.com',
    'throwawaymail.com',
    'tempmail.com',
    'fakeinbox.com',
    'mailnesia.com',
    'getairmail.com',
    'guerrillamail.org',
    'sharklasers.com',
    'grr.la',
    'guerrillamail.biz',
    'guerrillamail.com',
    'guerrillamail.de',
    'guerrillamail.net',
    'guerrillamail.org',
    'guerrillamailblock.com',
    'pokemail.net',
    'spam4.me',
    'getnada.com',
    'mail.tm',
    'tempmailo.com',
    'mailcatch.com',
    'mailinator.net',
    'mailinator.org',
    'notmailinator.com',
    'suremail.info',
    'thisisnotmyrealemail.com',
    'temporarymail.net',
    'temporarymail.com',
    'mailmetrash.com',
    'trashmail.net',
    'trashmail.me',
    'trashmail.de',
    'trashmail.ws',
    'trashmail.org',
    'trashmail.xyz',
    'trashmailer.com',
    'dodgit.com',
    'dodgit.org',
    'dodsi.com',
    'jetable.org',
    'jetable.com',
    'jetable.net',
    'jetable.org',
    'mailnull.com',
    'notsharingmy.info',
    'sogetthis.com',
    'spamgourmet.com',
    'spamherelots.com',
    'spamhereplease.com',
    'thisisnotmyrealemail.com',
    'tradermail.info',
    'veryrealemail.com',
    'zippymail.info',
    '0wnd.net',
    '0wnd.org',
    '10minutemail.com',
    '20minutemail.com',
    '30minutemail.com',
    '60minutemail.com',
    'anonymbox.com',
    'antichef.com',
    'antichef.net',
    'antireg.com',
    'antireg.ru',
    'antispam.de',
    'beefmilk.com',
    'binkmail.com',
    'bio-muesli.net',
    'bobmail.info',
    'bofthew.com',
    'brefmail.com',
    'bsnow.net',
    'bugmenot.com',
    'bumpymail.com',
    'casualdx.com',
    'centermail.com',
    'centermail.net',
    'chogmail.com',
    'choicemail1.com',
    'cool.fr.nf',
    'correo.blogos.net',
    'courriel.fr.nf',
    'courrieltemporaire.com',
    'cubiclink.com',
    'curryworld.de',
    'cust.in',
    'dacoolest.com',
    'dandikmail.com',
    'dayrep.com',
    'deadaddress.com',
    'despam.it',
    'despammed.com',
    'devnullmail.com',
    'dfgh.net',
    'digitalsanctuary.com',
    'dingbone.com',
    'discardmail.com',
    'discardmail.de',
    'dispostable.com',
    'dodgeit.com',
    'dodgit.com',
    'dodgit.org',
    'donemail.ru',
    'dontreg.com',
    'dontsendmespam.de',
    'drdrb.net',
    'dump-email.com',
    'dumpyemail.com',
    'e4ward.com',
    'email60.com',
    'emailias.com',
    'emailmiser.com',
    'emailsense.com',
    'emailtemporanea.com',
    'emailtemporanea.net',
    'emailtemporar.ro',
    'emailtemporario.com.br',
    'emailthe.net',
    'emailtmp.com',
    'emailwarden.com',
    'emailx.at.hm',
    'emailxfer.com',
    'emz.net',
    'enterto.com',
    'ephemail.net',
    'etranquil.com',
    'etranquil.net',
    'etranquil.org',
    'explodemail.com',
    'fakeinbox.com',
    'fakeinformation.com',
    'fastacura.com',
    'filzmail.com',
    'fizmail.com',
    'fr33mail.info',
    'frapmail.com',
    'fudgerub.com',
    'garliclife.com',
    'get1mail.com',
    'get2mail.fr',
    'getonemail.com',
    'getonemail.net',
    'ghosttexter.de',
    'girlsundertheinfluence.com',
    'gishpuppy.com',
    'great-host.in',
    'greensloth.com',
    'gsrv.co.uk',
    'guerillamail.biz',
    'guerillamail.com',
    'guerillamail.net',
    'guerillamail.org',
    'guerrillamail.biz',
    'guerrillamail.com',
    'guerrillamail.de',
    'guerrillamail.info',
    'guerrillamail.net',
    'guerrillamail.org',
    'guerrillamailblock.com',
    'h.mintemail.com',
    'h8s.org',
    'haltospam.com',
    'hatespam.org',
    'hidemail.de',
    'hmamail.com',
    'hochsitze.com',
    'hotpop.com',
    'ieatspam.eu',
    'ieatspam.net',
    'ihateyoualot.info',
    'iheartspam.org',
    'imails.info',
    'inboxclean.com',
    'inboxclean.org',
    'incognitomail.com',
    'incognitomail.net',
    'incognitomail.org',
    'ipoo.org',
    'irish2me.com',
    'iwi.net',
    'jetable.com',
    'jetable.fr.nf',
    'jetable.net',
    'jetable.org',
    'jnxjn.com',
    'junk1e.com',
    'kasmail.com',
    'kaspop.com',
    'killmail.com',
    'killmail.net',
    'klassmaster.com',
    'klassmaster.net',
    'klzlk.com',
    'knol-power.nl',
    'koszmail.pl',
    'kurzepost.de',
    'lhsdv.com',
    'lifebyfood.com',
    'link2mail.net',
    'litedrop.com',
    'lol.ovpn.to',
    'lolfreak.net',
    'lookugly.com',
    'lopl.co.cc',
    'lortemail.dk',
    'lr78.com',
    'm4ilweb.info',
    'maboard.com',
    'mail-temporaire.fr',
    'mail.by',
    'mail.mezimages.net',
    'mail.zapiermail.com',
    'mail1a.de',
    'mail21.cc',
    'mail2rss.org',
    'mail333.com',
    'mail4trash.com',
    'mailbidon.com',
    'mailbiz.biz',
    'mailblocks.com',
    'mailbucket.org',
    'mailcat.biz',
    'mailcatch.com',
    'mailde.de',
    'mailde.info',
    'maildrop.cc',
    'maileater.com',
    'mailexpire.com',
    'mailfa.tk',
    'mailforspam.com',
    'mailfreeonline.com',
    'mailguard.me',
    'mailin8r.com',
    'mailinater.com',
    'mailinator.com',
    'mailinator.net',
    'mailinator.org',
    'mailinator2.com',
    'mailincubator.com',
    'mailismagic.com',
    'mailita.tk',
    'mailme.ir',
    'mailme.lv',
    'mailme24.com',
    'mailmetrash.com',
    'mailmoat.com',
    'mailms.com',
    'mailnator.com',
    'mailnesia.com',
    'mailnull.com',
    'mailshell.com',
    'mailsiphon.com',
    'mailslite.com',
    'mailtemp.info',
    'mailtome.de',
    'mailtrash.net',
    'mailtv.net',
    'mailtv.tv',
    'mailzilla.com',
    'makemetheking.com',
    'manybrain.com',
    'mbx.cc',
    'mega.zik.dj',
    'meinspamschutz.de',
    'meltmail.com',
    'messagebeamer.de',
    'mierdamail.com',
    'mintemail.com',
    'moburl.com',
    'moncourrier.fr.nf',
    'monemail.fr.nf',
    'monmail.fr.nf',
    'monumentmail.com',
    'msa.minsmail.com',
    'mt2009.com',
    'mx0.wwwnew.com',
    'mycleaninbox.net',
    'mypacks.net',
    'mypartyclip.de',
    'myphantomemail.com',
    'myspaceinc.com',
    'myspaceinc.net',
    'myspaceinc.org',
    'myspacepimpedup.com',
    'myspamless.com',
    'mytemp.email',
    'mytempemail.com',
    'mytrashmail.com',
    'neomailbox.com',
    'nepwk.com',
    'nervmich.net',
    'nervtmich.net',
    'netmails.com',
    'netmails.net',
    'neverbox.com',
    'no-spam.ws',
    'nobulk.com',
    'noclickemail.com',
    'nodezine.com',
    'nomail.xl.cx',
    'nomail2me.com',
    'nomorespamemails.com',
    'nospam.ze.tc',
    'nospam4.us',
    'nospamfor.us',
    'nospammail.net',
    'notmailinator.com',
    'nowhere.org',
    'nowmymail.com',
    'nurfuerspam.de',
    'nus.edu.sg',
    'nwldx.com',
    'objectmail.com',
    'obobbo.com',
    'oneoffemail.com',
    'onewaymail.com',
    'online.ms',
    'oopi.org',
    'ordinaryamerican.net',
    'otherinbox.com',
    'ourklips.com',
    'outlawspam.com',
    'ovpn.to',
    'owlpic.com',
    'pancakemail.com',
    'pcusers.otherinbox.com',
    'pepbot.com',
    'pfui.ru',
    'pimpedupmyspace.com',
    'pingir.com',
    'plzdontmail.me',
    'pookmail.com',
    'privacy.net',
    'proxymail.eu',
    'prtnx.com',
    'putthisinyourspamdatabase.com',
    'qq.com',
    'quickinbox.com',
    'rcpt.at',
    'recode.me',
    'recursor.net',
    'regbypass.com',
    'regbypass.comsafe-mail.net',
    'rejectmail.com',
    'rhyta.com',
    'rklips.com',
    'rmqkr.net',
    'rppkn.com',
    'rtrtr.com',
    's0ny.net',
    'safe-mail.net',
    'safetymail.info',
    'safetypost.de',
    'sandelf.de',
    'saynotospams.com',
    'selfdestructingmail.com',
    'sendspamhere.com',
    'sharklasers.com',
    'shiftmail.com',
    'shitmail.me',
    'shortmail.net',
    'sibmail.com',
    'skeefmail.com',
    'slaskpost.se',
    'slopsbox.com',
    'smellfear.com',
    'snakemail.com',
    'sneakemail.com',
    'sneakmail.de',
    'sofimail.com',
    'sofort-mail.de',
    'sogetthis.com',
    'soodonims.com',
    'spam.la',
    'spam.su',
    'spam4.me',
    'spamavert.com',
    'spambob.net',
    'spambob.org',
    'spambog.com',
    'spambog.de',
    'spambog.ru',
    'spambooger.com',
    'spamcero.com',
    'spamcowboy.com',
    'spamcowboy.net',
    'spamcowboy.org',
    'spamday.com',
    'spamex.com',
    'spamfree24.com',
    'spamfree24.de',
    'spamfree24.eu',
    'spamfree24.info',
    'spamfree24.net',
    'spamfree24.org',
    'spamgourmet.com',
    'spamgourmet.net',
    'spamgourmet.org',
    'spamherelots.com',
    'spamhereplease.com',
    'spamhole.com',
    'spamify.com',
    'spaminator.de',
    'spamkill.info',
    'spaml.com',
    'spamlot.net',
    'spammotel.com',
    'spamobox.com',
    'spamsalad.in',
    'spamserver.cf',
    'spamslicer.com',
    'spamspot.com',
    'spamthis.co.uk',
    'spamthisplease.com',
    'spamtrail.com',
    'speed.1s.fr',
    'spoofmail.de',
    'squizzy.de',
    'sry.li',
    'startkeys.com',
    'stinkefinger.net',
    'stophabbos.tk',
    'stuffmail.de',
    'supergreatmail.com',
    'supermailer.jp',
    'suremail.info',
    'talkinator.com',
    'teewars.org',
    'teleworm.com',
    'teleworm.us',
    'temp-mail.de',
    'temp-mail.org',
    'temp-mail.ru',
    'temp.emeraldwebmail.com',
    'temp.headstrong.de',
    'tempail.com',
    'tempalias.com',
    'tempe-mail.com',
    'tempemail.biz',
    'tempemail.com',
    'tempemail.net',
    'tempinbox.co.uk',
    'tempinbox.com',
    'tempmail.it',
    'tempmail2.com',
    'tempmaildemo.com',
    'tempmailer.com',
    'tempomail.fr',
    'temporarily.de',
    'temporarioemail.com.br',
    'temporaryemail.net',
    'temporaryemail.us',
    'temporaryforwarding.com',
    'temporaryinbox.com',
    'tempsky.com',
    'tempthe.net',
    'tempymail.com',
    'thecloudindex.com',
    'thisisnotmyrealemail.com',
    'thrma.com',
    'throam.com',
    'throwawayemailaddress.com',
    'tilien.com',
    'tmailinator.com',
    'tradermail.info',
    'trash-amil.com',
    'trash-mail.at',
    'trash-mail.com',
    'trash-mail.de',
    'trash-mail.ga',
    'trash-mail.gq',
    'trash-mail.ml',
    'trash-mail.tk',
    'trash2009.com',
    'trashdevil.com',
    'trashdevil.de',
    'trashemail.de',
    'trashmail.at',
    'trashmail.com',
    'trashmail.de',
    'trashmail.me',
    'trashmail.net',
    'trashmail.org',
    'trashmail.ws',
    'trashmailer.com',
    'trashymail.com',
    'trashymail.net',
    'trillianpro.com',
    'turual.com',
    'twinmail.de',
    'tyldd.com',
    'uggsrock.com',
    'umail.net',
    'veryrealemail.com',
    'viditag.com',
    'vip.188.com',
    'vip.163.com',
    'vip.21cn.com',
    'vip.citiz.net',
    'vip.qq.com',
    'vip.sina.com',
    'vip.sohu.com',
    'vip.tom.com',
    'vipmail.in',
    'vipmail.name',
    'vipmail.pw',
    'vipmail.ru',
    'vipmail.tk',
    'vipmail.xyz',
    'vipsohu.net',
    'vipxm.net',
    'vomoto.com',
    'vubby.com',
    'wasteland.rfc822.org',
    'webemail.me',
    'webm4il.info',
    'webuser.in',
    'weg-werf-email.de',
    'wegwerf-emails.de',
    'wegwerfadresse.de',
    'wegwerfemail.com',
    'wegwerfemail.de',
    'wegwerfmail.de',
    'wegwerfmail.info',
    'wegwerfmail.net',
    'wegwerfmail.org',
    'wetrainbayarea.com',
    'wetrainbayarea.org',
    'wh4f.org',
    'whyspam.me',
    'willhackforfood.biz',
    'willselfdestruct.com',
    'winemaven.info',
    'wronghead.com',
    'wuzup.net',
    'wuzupmail.net',
    'www.e4ward.com',
    'www.gishpuppy.com',
    'www.mailinator.com',
    'wwwnew.eu',
    'xagloo.com',
    'xemaps.com',
    'xents.com',
    'xmaily.com',
    'xoxy.net',
    'yep.it',
    'yogamaven.com',
    'yopmail.com',
    'yopmail.fr',
    'yopmail.net',
    'ypmail.webarnak.fr.eu.org',
    'yuurok.com',
    'z1p.biz',
    'za.com',
    'zehnminuten.de',
    'zehnminutenmail.de',
    'zippymail.info',
    'zoaxe.com',
    'zoemail.com',
    'zoemail.net',
    'zoemail.org',
    'zomg.info',
    'zxcv.com',
    'zxcvbnm.com',
    'zzz.com'
  ];
  
  // Verificar se o domínio está na lista de bloqueados
  const isBlocked = blockedDomains.some((blockedDomain: string) => 
    domain.toLowerCase().endsWith(blockedDomain.toLowerCase())
  );
  
  if (isBlocked) {
    const errorMessage = 'Endereços de email temporários ou descartáveis não são permitidos';
    console.log(`[API] Erro: ${errorMessage} - ${domain}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'TEMPORARY_EMAIL_NOT_ALLOWED',
      domain: domain
    });
  }
  
  // Verificar se o domínio é um endereço de link-local ou documentação
  const linkLocalRegex = /^(169\.254|fe[89ab][0-9a-f]::?|::1$)/i;
  const documentationRegex = /^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|2001:db8:)/i;
  
  if (linkLocalRegex.test(domain)) {
    const errorMessage = 'Endereços de link-local não são permitidos';
    console.log(`[API] Erro: ${errorMessage} - ${domain}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'LINK_LOCAL_ADDRESS_NOT_ALLOWED',
      domain: domain
    });
  }
  
  if (documentationRegex.test(domain)) {
    const errorMessage = 'Endereços de documentação não são permitidos';
    console.log(`[API] Erro: ${errorMessage} - ${domain}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'DOCUMENTATION_ADDRESS_NOT_ALLOWED',
      domain: domain
    });
  }
  
  // Verificar se o domínio tem um TLD válido
  const tldRegex = /\.[a-zA-Z]{2,}$/;
  if (!tldRegex.test(domain)) {
    const errorMessage = 'Domínio de email inválido: TLD ausente ou muito curto';
    console.log(`[API] Erro: ${errorMessage} - ${domain}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_EMAIL_TLD',
      domain: domain
    });
  }
  
  // Já extraímos o domínio anteriormente, vamos reutilizar a variável existente
  if (!domain) {
    return res.status(400).json({
      success: false,
      message: 'Domínio de email inválido',
      code: 'INVALID_EMAIL_DOMAIN',
      domain: domain
    });
  }
  
  // Lista de domínios reservados
  const reservedDomains: string[] = [
    'localhost',
    'localdomain',
    'localhost.localdomain',
    'local',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    '0',
    '1',
    'localnet',
    'lan',
    'intranet',
    'internal',
    'private',
    'test',
    'example',
    'invalid',
    'example.com',
    'example.net',
    'example.org',
    'test.com',
    'test.net',
    'test.org',
    // Faixas de IP reservadas
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '169.254.0.0/16',
    '192.0.2.0/24',
    '198.51.100.0/24',
    '203.0.113.0/24',
    '224.0.0.0/4',
    '240.0.0.0/4'
  ];
  
  // Verificar se o domínio está na lista de reservados ou em uma faixa reservada
  const isReserved = reservedDomains.some((reserved: string) => {
    const lowerDomain = emailDomain.toLowerCase();
    const lowerReserved = reserved.toLowerCase();
    
    // Verificação direta para strings
    if (lowerDomain === lowerReserved || lowerDomain.endsWith('.' + lowerReserved)) {
      return true;
    }
    
    // Verificação para faixas CIDR
    if (lowerReserved.includes('/')) {
      try {
        // Se o domínio for um IP, verifica se está na faixa
        if (/^\d+\.\d+\.\d+\.\d+$/.test(lowerDomain)) {
          return isInRange(lowerDomain, lowerReserved);
        }
      } catch (e) {
        console.error(`[API] Erro ao verificar faixa CIDR: ${e}`);
      }
    }
    
    return false;
  });
  
  if (isReserved) {
    const errorMessage = 'Domínio de email inválido: domínio local/não roteável não permitido';
    console.log(`[API] Erro: ${errorMessage} - ${emailDomain}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_EMAIL_DOMAIN',
      domain: emailDomain
    });
  }
  
  // Verificar caracteres não-ASCII no email (a menos que estejam em formato Unicode normalizado)
  const nonAsciiRegex = /[^\x00-\x7F]/;
  if (nonAsciiRegex.test(email) && email !== email.normalize('NFC')) {
    const errorMessage = 'O email contém caracteres não-ASCII que não estão em formato Unicode normalizado';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_EMAIL_CHARACTERS',
      details: 'Caracteres não-ASCII devem estar em formato Unicode normalizado (NFC)'
    });
  }
  
  // Verificar pontos consecutivos ou no início/fim do email
  const emailParts = email.split('@');
  if (email.includes('..') || 
      email.startsWith('.') || 
      email.endsWith('.') ||
      (emailParts[0] && (emailParts[0].startsWith('.') || emailParts[0].endsWith('.'))) ||
      (emailParts[1] && emailParts[1].split('.').some((part: string) => part === ''))) {
    const errorMessage = 'O email não pode conter pontos consecutivos ou no início/fim do nome de usuário/domínio';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_EMAIL_FORMAT',
      details: 'Remova pontos consecutivos ou pontos no início/fim do nome de usuário/domínio'
    });
  }
  
  // Verificar caracteres inválidos no email
  const invalidCharsRegex = /[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u2000-\u200F\u2028-\u202F\u205F\u3000\uFEFF]/;
  if (invalidCharsRegex.test(email)) {
    const errorMessage = 'O e-mail contém caracteres inválidos';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_EMAIL_CHARACTERS'
    });
  }
  
  if (email.length > MAX_EMAIL_LENGTH) {
    const errorMessage = 'O e-mail é muito longo';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'EMAIL_TOO_LONG',
      maxLength: MAX_EMAIL_LENGTH
    });
  }
  
  if (!emailRegex.test(email)) {
    const errorMessage = 'Formato de e-mail inválido';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_EMAIL_FORMAT'
    });
  }
  
  // Verificar se a senha não está vazia
  if (!senha.trim()) {
    const errorMessage = 'A senha não pode estar vazia';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'EMPTY_PASSWORD'
    });
  }
  
  // Validar caracteres da senha
  const invalidPasswordCharsRegex = /[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u2000-\u200F\u2028-\u202F\u205F\u3000\uFEFF]/;
  if (invalidPasswordCharsRegex.test(senha)) {
    const errorMessage = 'A senha contém caracteres inválidos';
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'INVALID_PASSWORD_CHARACTERS'
    });
  }
  
  // Validar comprimento da senha
  const MIN_PASSWORD_LENGTH = 6;
  const MAX_PASSWORD_LENGTH = 100; // Limite razoável para senhas
  
  if (typeof senha !== 'string' || senha.length < MIN_PASSWORD_LENGTH) {
    const errorMessage = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'PASSWORD_TOO_SHORT',
      minLength: MIN_PASSWORD_LENGTH
    });
  }
  
  if (senha.length > MAX_PASSWORD_LENGTH) {
    const errorMessage = `A senha não pode ter mais de ${MAX_PASSWORD_LENGTH} caracteres`;
    console.log(`[API] Erro: ${errorMessage}`);
    return res.status(400).json({
      success: false,
      message: errorMessage,
      code: 'PASSWORD_TOO_LONG',
      maxLength: MAX_PASSWORD_LENGTH
    });
  }
  
  // Verificar taxa de tentativas de login
  const MAX_ATTEMPTS = 5;
  const BLOCK_TIME_MINUTES = 15;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  const cacheKey = `login_attempts:${ip}:${email}`;
  
  try {
    // Implementação do rate limiting pode ser feita aqui
    // Exemplo com Redis:
    // const attempts = await redisClient.get(cacheKey) || 0;
    // if (parseInt(attempts, 10) >= MAX_ATTEMPTS) {
    //   console.log(`[SECURITY] Muitas tentativas de login para o email: ${email} do IP: ${ip}`);
    //   return res.status(429).json({
    //     success: false,
    //     message: `Muitas tentativas de login. Tente novamente em ${BLOCK_TIME_MINUTES} minutos.`,
    //     code: 'TOO_MANY_ATTEMPTS',
    //     retryAfter: BLOCK_TIME_MINUTES * 60 // segundos
    //   });
    // }
    console.log(`[SECURITY] Tentativa de login para ${email} do IP: ${ip}`);
  } catch (rateLimitError) {
    console.error('[SECURITY] Erro ao verificar taxa de tentativas:', rateLimitError);
    // Não bloqueia o login em caso de falha no sistema de rate limiting
  }
  
  // Log seguro dos dados recebidos
  console.log('[API] Dados recebidos:', { 
    email, 
    hasPassword: !!senha,
    passwordLength: senha.length,
    requestId: req.headers['x-request-id'] || 'none'
  });
  
  // Registrar a tentativa de login (sem expor dados sensíveis)
  console.log(`[AUDIT] Tentativa de login para o email: ${email} (${req.socket.remoteAddress})`);

  try {
    console.log('[API] Tentativa de login para o email:', email);
    
    // Verificar se o usuário existe
    console.log('[API] Buscando usuário no banco de dados...');
    
    let user: Usuario | null = null;
    try {
      console.log('[API] Email fornecido:', email);
      
      // Buscar usuário por email (incluindo inativos para melhor mensagem de erro)
      const result = await prisma.$queryRaw<Usuario[]>`
        SELECT * FROM "Usuario" 
        WHERE email = ${email}
        LIMIT 1
      `;
      
      user = result[0] || null;
      console.log(`[API] Usuário ${user ? 'encontrado' : 'não encontrado'}`);
      
      if (!user) {
        // Pequeno atraso para evitar timing attacks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (dbError) {
      console.error('[API] Erro ao buscar usuário no banco de dados:', dbError);
      // Não revelar detalhes do banco de dados para o cliente
      throw new Error('Erro ao processar a requisição');
    }

    console.log('[API] Resultado da busca por usuário:', user ? 'Encontrado' : 'Não encontrado');
    
    // Verificar se o usuário existe
    if (!user) {
      console.log(`[AUDIT] Tentativa de login com email não cadastrado: ${email}`);
      // Pequeno atraso para evitar timing attacks
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.status(401).json({ 
        success: false,
        message: 'E-mail ou senha inválidos',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verificar se a conta está ativa
    if (!user.ativo) {
      console.log(`[AUDIT] Tentativa de login em conta desativada: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Esta conta foi desativada. Entre em contato com o suporte para mais informações.',
        code: 'ACCOUNT_DISABLED'
      });
    }
    
    // Verificar se o tipo de usuário é válido
    const tiposValidos = ['ADMIN', 'USER', 'MODERATOR'];
    if (!user.tipo || !tiposValidos.includes(user.tipo)) {
      console.error(`[API] Tipo de usuário inválido: ${user.tipo} para o email: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Tipo de usuário inválido. Entre em contato com o suporte.',
        code: 'INVALID_USER_TYPE'
      });
    }

    // Verificar a senha
    console.log('Iniciando comparação de senhas...');
    let senhaValida = false;
    try {
      if (!user.senha) {
        console.error('[API] Hash de senha não encontrado para o usuário');
        throw new Error('Credenciais inválidas');
      }
      
      // Comparar a senha fornecida com o hash armazenado
      const { senha: senhaFornecida } = req.body;
      senhaValida = await compare(senhaFornecida, user.senha);
      
      if (!senhaValida) {
        console.log(`[API] Senha inválida para o usuário: ${user.email}`);
        return res.status(401).json({ 
          success: false,
          message: 'E-mail ou senha inválidos',
          code: 'INVALID_CREDENTIALS'
        });
      }
    } catch (error) {
      console.error('[API] Erro ao verificar a senha:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar a autenticação',
        code: 'AUTH_ERROR'
      });
    }

    // Atualizar último acesso
    try {
      console.log(`[API] Atualizando último acesso para o usuário: ${user.id}`);
      await prisma.$executeRaw`
        UPDATE "Usuario" 
        SET "ultimoAcesso" = NOW() 
        WHERE id = ${user.id}::uuid
      `;
      console.log('[API] Último acesso atualizado com sucesso');
    } catch (updateError) {
      console.error('[API] Erro ao atualizar último acesso:', updateError);
      // Não falha o login por causa disso, apenas registra o erro
    }

    // Criar token JWT
    let token: string;
    try {
      console.log('[API] Criando token JWT...');
      
      // Tempo de expiração do token (24 horas)
      const expiresIn = 24 * 60 * 60; // 24 horas em segundos
      const iat = Math.floor(Date.now() / 1000); // Data atual em segundos
      const exp = iat + expiresIn; // Data de expiração
      
      // Payload do token
      const payload = {
        sub: user.id, // Subject (identificador único do usuário)
        email: user.email,
        tipo: user.tipo,
        iat, // Issued At
        exp,  // Expiration Time
        jti: crypto.randomUUID() // ID único para o token (JWT ID)
      };
      
      // Opções do token
      const options: any = {
        algorithm: 'HS256', // Algoritmo de assinatura
        issuer: process.env.JWT_ISSUER || 'sua-aplicacao', // Emissor do token
        audience: process.env.JWT_AUDIENCE || 'sua-aplicacao-web', // Público-alvo
      };
      
      // Garantir que a chave secreta está definida
      if (!JWT_SECRET || JWT_SECRET === 'seu_segredo_secreto') {
        console.error('[API] AVISO: Chave JWT_SECRET não configurada ou está usando o valor padrão');
        // Em produção, isso deve ser tratado como um erro crítico
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Erro de configuração do servidor');
        }
      }
      
      // Gerar o token
      token = sign(payload, JWT_SECRET, options);
      
      // Verificar se o token foi gerado corretamente
      if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        console.error('[API] Token JWT inválido gerado');
        throw new Error('Falha ao gerar token de autenticação');
      }
      
      console.log('[API] Token JWT criado com sucesso');
      console.log(`[API] Token expira em: ${new Date(exp * 1000).toISOString()}`);
      console.log(`[DEBUG] Comprimento do token: ${token.length} caracteres`);
      
    } catch (tokenError) {
      console.error('[API] Erro ao criar token JWT:', tokenError);
      // Não revelar detalhes do erro para o cliente
      throw new Error('Erro ao processar a autenticação');
    }

    // Atualizar o último acesso do usuário
    try {
      console.log('[API] Atualizando último acesso do usuário...');
      await prisma.$executeRaw`
        UPDATE "Usuario" 
        SET "ultimoAcesso" = NOW()
        WHERE id = ${user.id}
      `;
      console.log('[API] Último acesso atualizado com sucesso');
    } catch (updateError) {
      console.error('[API] Erro ao atualizar último acesso:', updateError);
      // Não falha o login por causa disso, apenas registra o erro
    }

    // Configurar o cookie
    try {
      console.log('[API] Configurando cookie...');
      console.log('[API] Ambiente:', process.env.NODE_ENV);
      
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'lax' | 'strict' | 'none';
        maxAge: number;
        path: string;
        domain?: string;
      } = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'lax' : 'lax',
        maxAge: 60 * 60 * 24, // 24 horas
        path: '/',
      };
      
      // Apenas adiciona o domínio em produção
      const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
      if (isProduction && cookieDomain) {
        cookieOptions.domain = cookieDomain;
        console.log('[API] Domínio do cookie definido para:', cookieDomain);
      }
      
      console.log('[API] Opções do cookie:', JSON.stringify(cookieOptions, null, 2));
      
      const cookie = serialize(COOKIE_NAME, token, cookieOptions);
      res.setHeader('Set-Cookie', cookie);
      console.log('[API] Cookie configurado com sucesso');
    } catch (cookieError) {
      console.error('[API] Erro ao configurar cookie:', cookieError);
      // Não falha o login por causa disso, apenas registra o erro
    }

    // Retornar os dados do usuário (sem a senha)
    const { senha: _, ...usuarioSemSenha } = user;
    console.log('[API] Login realizado com sucesso para o usuário:', user.email);
    
    // Configurar headers para a resposta
    const securityHeaders: Record<string, string> = {
      ...CORS_HEADERS,
      // Prevenir clickjacking
      'X-Frame-Options': 'DENY',
      // Prevenir detecção de MIME type
      'X-Content-Type-Options': 'nosniff',
      // Política de segurança de conteúdo
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Feature Policy
      'Permissions-Policy': "geolocation=(), microphone=(), camera=()",
      // Adicionar token para clientes que usam headers
      'Authorization': `Bearer ${token}`
    };
    
    // Aplicar todos os headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, value);
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        ...usuarioSemSenha,
        // Garantir que as datas sejam strings
        dataCriacao: user.dataCriacao.toISOString(),
        ultimoAcesso: user.ultimoAcesso ? user.ultimoAcesso.toISOString() : null,
      },
      // Incluir o token na resposta para clientes que não usam cookies
      token,
      // Metadados adicionais
      expiresIn: 60 * 60 * 24, // 24 horas em segundos
      tokenType: 'Bearer',
    });
  } catch (error: unknown) {
    console.error('[API] Erro no processo de login:', error);
    
    // Configurar headers CORS para resposta de erro
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Tratamento de erros específicos
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('banco de dados') || message.includes('database')) {
        return res.status(503).json({
          success: false,
          message: 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
        });
      } 
      
      if (message.includes('credenciais') || message.includes('senha') || message.includes('email')) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }
      
      // Erro de validação de dados
      if (message.includes('validation') || message.includes('validação')) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          details: process.env.NODE_ENV === 'development' ? message : undefined
        });
      }
    }
    
    // Erro genérico
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API] Erro interno do servidor:', errorMessage);
    
    return res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

export default allowCors(handler);
