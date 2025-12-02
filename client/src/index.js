#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  createHolderHash,
  generateCertId,
  generateSalt,
  formatTimestamp,
  saveCertificate,
  loadCertificates,
  findCertificateById,
  displayResult
} from './utils.js';
import {
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
  getCertificateInfo,
  testConnection,
  getOwner
} from './contract.js';

const program = new Command();

program
  .name('certificate-cli')
  .description('Blockchain Sertifika Doğrulama Sistemi - CLI')
  .version('1.0.0');

/**
 * Sertifika Verme Komutu
 */
program
  .command('issue')
  .description('Yeni sertifika oluştur ve blockchain\'e kaydet')
  .option('-s, --studentId <id>', 'Öğrenci numarası')
  .option('-n, --name <name>', 'Ad Soyad')
  .option('-t, --title <title>', 'Sertifika başlığı')
  .option('-i, --issuer <issuer>', 'Veren kurum')
  .option('-d, --days <days>', 'Geçerlilik süresi (gün, 0=süresiz)', '0')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n📜 Sertifika Verme İşlemi\n'));

    try {
      // Eksik parametreler için sor
      let { studentId, name, title, issuer, days } = options;

      if (!studentId || !name || !title || !issuer) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'studentId',
            message: 'Öğrenci Numarası:',
            when: !studentId,
            validate: input => input.length > 0 || 'Öğrenci numarası gerekli!'
          },
          {
            type: 'input',
            name: 'name',
            message: 'Ad Soyad:',
            when: !name,
            validate: input => input.length > 0 || 'Ad soyad gerekli!'
          },
          {
            type: 'input',
            name: 'title',
            message: 'Sertifika Başlığı:',
            when: !title,
            validate: input => input.length > 0 || 'Başlık gerekli!'
          },
          {
            type: 'input',
            name: 'issuer',
            message: 'Veren Kurum:',
            when: !issuer,
            default: 'Konya Teknik Üniversitesi'
          },
          {
            type: 'input',
            name: 'days',
            message: 'Geçerlilik Süresi (gün, 0=süresiz):',
            default: '365',
            validate: input => !isNaN(input) || 'Sayı giriniz!'
          }
        ]);

        studentId = studentId || answers.studentId;
        name = name || answers.name;
        title = title || answers.title;
        issuer = issuer || answers.issuer;
        days = days || answers.days;
      }

      const spinner = ora('Sertifika oluşturuluyor...').start();

      // Benzersiz değerler üret
      const certId = generateCertId();
      const salt = generateSalt();
      const holderHash = createHolderHash(studentId, name, salt);

      // Süre hesapla
      const daysNum = parseInt(days);
      const expiresAt = daysNum > 0 
        ? Math.floor(Date.now() / 1000) + (daysNum * 24 * 60 * 60)
        : 0;

      // Blockchain'e kaydet
      spinner.text = 'Blockchain\'e kaydediliyor...';
      const receipt = await issueCertificate(certId, holderHash, title, issuer, expiresAt);

      // Yerel dosyaya kaydet
      spinner.text = 'Yerel kayıt yapılıyor...';
      await saveCertificate({
        id: certId,
        studentId,
        name,
        title,
        issuer,
        salt,
        holderHash,
        expiresAt,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      spinner.succeed(chalk.green('Sertifika başarıyla oluşturuldu!'));

      // Özet göster
      console.log('\n' + '='.repeat(60));
      console.log(chalk.green.bold('✓ SERTİFİKA BİLGİLERİ'));
      console.log('='.repeat(60));
      console.log(chalk.cyan('Sertifika ID:  ') + certId);
      console.log(chalk.cyan('Öğrenci No:    ') + studentId);
      console.log(chalk.cyan('Ad Soyad:      ') + name);
      console.log(chalk.cyan('Başlık:        ') + title);
      console.log(chalk.cyan('Veren:         ') + issuer);
      console.log(chalk.cyan('Geçerlilik:    ') + (daysNum > 0 ? `${daysNum} gün` : 'Süresiz'));
      console.log(chalk.cyan('TX Hash:       ') + receipt.hash);
      console.log('='.repeat(60));
      
      console.log(chalk.yellow('\n⚠️  ÖNEMLI: Bu bilgileri saklayın!'));
      console.log(chalk.yellow('   Sertifika ID ve öğrenci bilgileri doğrulama için gereklidir.\n'));

    } catch (error) {
      console.error(chalk.red('\n✗ Hata:'), error.message);
      process.exit(1);
    }
  });

/**
 * Sertifika Doğrulama Komutu
 */
program
  .command('verify')
  .description('Sertifikayı doğrula')
  .option('-c, --certId <id>', 'Sertifika ID')
  .option('-s, --studentId <id>', 'Öğrenci numarası')
  .option('-n, --name <name>', 'Ad Soyad')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🔍 Sertifika Doğrulama\n'));

    try {
      let { certId, studentId, name } = options;

      // Eksik parametreler için sor
      if (!certId || !studentId || !name) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'certId',
            message: 'Sertifika ID:',
            when: !certId,
            validate: input => input.length > 0 || 'Sertifika ID gerekli!'
          },
          {
            type: 'input',
            name: 'studentId',
            message: 'Öğrenci Numarası:',
            when: !studentId,
            validate: input => input.length > 0 || 'Öğrenci numarası gerekli!'
          },
          {
            type: 'input',
            name: 'name',
            message: 'Ad Soyad:',
            when: !name,
            validate: input => input.length > 0 || 'Ad soyad gerekli!'
          }
        ]);

        certId = certId || answers.certId;
        studentId = studentId || answers.studentId;
        name = name || answers.name;
      }

      const spinner = ora('Sertifika doğrulanıyor...').start();

      // Salt'ı bul
      const localCert = await findCertificateById(certId);
      
      if (!localCert) {
        spinner.warn(chalk.yellow('Yerel kayıt bulunamadı, salt hesaplanamıyor.'));
        console.log(chalk.yellow('\nYerel kayıt olmadan doğrulama yapılamaz.'));
        console.log(chalk.yellow('Salt değerini manuel olarak girmeniz gerekir.\n'));
        
        const { salt } = await inquirer.prompt([
          {
            type: 'input',
            name: 'salt',
            message: 'Salt değerini girin:',
            validate: input => input.length > 0 || 'Salt gerekli!'
          }
        ]);
        
        const holderHash = createHolderHash(studentId, name, salt);
        const result = await verifyCertificate(certId, holderHash);
        
        spinner.stop();
        displayResult(result, chalk);
        return;
      }

      // Hash oluştur ve doğrula
      const holderHash = createHolderHash(studentId, name, localCert.salt);
      const result = await verifyCertificate(certId, holderHash);

      spinner.stop();
      displayResult(result, chalk);

    } catch (error) {
      console.error(chalk.red('\n✗ Hata:'), error.message);
      process.exit(1);
    }
  });

/**
 * Sertifika İptal Komutu
 */
program
  .command('revoke')
  .description('Sertifikayı iptal et')
  .option('-c, --certId <id>', 'Sertifika ID')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🚫 Sertifika İptali\n'));

    try {
      let { certId } = options;

      if (!certId) {
        const answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'certId',
            message: 'İptal edilecek Sertifika ID:',
            validate: input => input.length > 0 || 'Sertifika ID gerekli!'
          }
        ]);
        certId = answer.certId;
      }

      // Önce sertifika bilgilerini göster
      const spinner = ora('Sertifika bilgileri getiriliyor...').start();
      const info = await getCertificateInfo(certId);

      if (!info) {
        spinner.fail(chalk.red('Sertifika bulunamadı!'));
        return;
      }

      spinner.stop();

      console.log(chalk.yellow('\nİptal edilecek sertifika:'));
      console.log(chalk.cyan('Başlık: ') + info.title);
      console.log(chalk.cyan('Veren:  ') + info.issuer);

      if (info.revoked) {
        console.log(chalk.red('\nBu sertifika zaten iptal edilmiş!\n'));
        return;
      }

      // Onay iste
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Bu sertifikayı iptal etmek istediğinizden emin misiniz?',
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('\nİşlem iptal edildi.\n'));
        return;
      }

      const revokeSpinner = ora('Sertifika iptal ediliyor...').start();
      const receipt = await revokeCertificate(certId);

      revokeSpinner.succeed(chalk.green('Sertifika başarıyla iptal edildi!'));
      console.log(chalk.cyan('\nTX Hash: ') + receipt.hash + '\n');

    } catch (error) {
      console.error(chalk.red('\n✗ Hata:'), error.message);
      process.exit(1);
    }
  });

/**
 * Sertifika Listeleme Komutu
 */
program
  .command('list')
  .description('Yerel kayıtlı sertifikaları listele')
  .action(async () => {
    console.log(chalk.blue.bold('\n📋 Kayıtlı Sertifikalar\n'));

    try {
      const certificates = await loadCertificates();

      if (certificates.length === 0) {
        console.log(chalk.yellow('Henüz kayıtlı sertifika yok.\n'));
        return;
      }

      console.log(chalk.cyan(`Toplam ${certificates.length} sertifika bulundu:\n`));

      for (const cert of certificates) {
        console.log(chalk.green('─'.repeat(60)));
        console.log(chalk.cyan('ID:          ') + cert.id);
        console.log(chalk.cyan('Öğrenci No:  ') + cert.studentId);
        console.log(chalk.cyan('Ad Soyad:    ') + cert.name);
        console.log(chalk.cyan('Başlık:      ') + cert.title);
        console.log(chalk.cyan('Veren:       ') + cert.issuer);
        console.log(chalk.cyan('Geçerlilik:  ') + formatTimestamp(cert.expiresAt));
      }

      console.log(chalk.green('─'.repeat(60) + '\n'));

    } catch (error) {
      console.error(chalk.red('\n✗ Hata:'), error.message);
      process.exit(1);
    }
  });

/**
 * Bağlantı Test Komutu
 */
program
  .command('status')
  .description('Blockchain bağlantısını ve contract durumunu kontrol et')
  .action(async () => {
    console.log(chalk.blue.bold('\n🔌 Sistem Durumu\n'));

    try {
      const spinner = ora('Bağlantı kontrol ediliyor...').start();

      const status = await testConnection();

      if (!status.connected) {
        spinner.fail(chalk.red('Blockchain\'e bağlanılamadı!'));
        console.log(chalk.red('Hata: ') + status.error + '\n');
        return;
      }

      const owner = await getOwner();

      spinner.succeed(chalk.green('Blockchain bağlantısı başarılı!'));

      console.log('\n' + '='.repeat(60));
      console.log(chalk.green.bold('✓ SİSTEM DURUMU'));
      console.log('='.repeat(60));
      console.log(chalk.cyan('Chain ID:      ') + status.chainId);
      console.log(chalk.cyan('Block Number:  ') + status.blockNumber);
      console.log(chalk.cyan('Contract:      ') + process.env.CONTRACT_ADDRESS);
      console.log(chalk.cyan('Owner:         ') + owner);
      console.log('='.repeat(60) + '\n');

    } catch (error) {
      console.error(chalk.red('\n✗ Hata:'), error.message);
      process.exit(1);
    }
  });

// Yardım komutunu özelleştir
program.on('--help', () => {
  console.log('');
  console.log(chalk.blue.bold('Örnek Kullanımlar:'));
  console.log('');
  console.log('  $ npm start issue -s 210101001 -n "Ahmet Yılmaz" -t "Blockchain Eğitimi" -i "KTUN"');
  console.log('  $ npm start verify -c 0x... -s 210101001 -n "Ahmet Yılmaz"');
  console.log('  $ npm start revoke -c 0x...');
  console.log('  $ npm start list');
  console.log('  $ npm start status');
  console.log('');
});

// Programı çalıştır
program.parse();
