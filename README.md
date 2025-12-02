# Certificate Verification System --- Blockchain + Docker

Bu proje, Docker tabanlı çok kapılı bir mimari üzerinde çalışan basit
bir **dijital sertifika oluşturma, doğrulama ve iptal etme sistemi**
geliştirir. Sistem; Ganache (yerel blockchain), Hardhat (akıllı kontrat
geliştirme) ve Node.js tabanlı bir istemciden (client) oluşur.

## Amaç

Bu projenin amacı:

✔ Docker ile çok kapılı bir blockchain geliştirme ortamı kurmak\
✔ Akıllı kontrat üzerinde sertifika **oluşturma (issue)**, **doğrulama
(verify)** ve **iptal (revoke)** işlemlerini gerçekleştirmek\
✔ Zincire kişisel veri yazmadan hash tabanlı model kullanmak\
✔ Node.js tabanlı bir CLI istemci üzerinden zincir ile etkileşime
geçmek\

## Mimari

Sistem Docker Compose üzerinde **certnet** adında özel bir ağda çalışan
üç servisten oluşur:

  
  Servis            --            Açıklama
  
  ganache           --            Yerel EVM uyumlu blockchain düğümü


  hardhat           --            Kontratların derlenmesi, deploy ve test
                                  için geliştirme ortamı
                                  

  client            --            Sertifika hash üretimi, kontrat ile
                                  etkileşim ve doğrulama CLI'ı
                                  
## Bileşenler

-   Docker Desktop + Compose v2
-   Node.js 20
-   Hardhat
-   Ethers.js
-   Ganache
-   Node.js tabanlı CLI

## Kurulum

### 1. Depoyu klonla
    ```bash
    git clone <repo-url>
    cd blokchain_sertifika
    ```
### 2. Docker ortamını başlat
    ```bash
    docker compose up -d --build
    ```
### 3. Hardhat container'a gir
    ```bash
    docker compose exec hardhat sh
    npm install
    ```
### 4. Akıllı kontratı deploy et
    ```bash
    npx hardhat run scripts/deploy.js --network localhost
    ```
Çıkan adresi client/.env dosyasına ekleyin:

    CONTRACT_ADDRESS=0x...
    RPC_URL=http://ganache:8545

### 5. Client container'a gir
    ```bash
    docker compose exec client sh
    npm install
    npm start
    ```
## Akıllı Kontrat --- CertificateRegistry.sol

Kontrat KVKK uyumlu olacak şekilde zincire yalnızca hash ve meta veriler
yazar.

Desteklenen fonksiyonlar:
issue()  --  Yeni sertifika oluşturur
revoke() --  Sertifikayı iptal eder 
verify() --  Geçerlilik sorgusu döner

## İstemci (Client)

Client tarafı Node.js tabanlıdır ve issue, verify, revoke işlemlerini
CLI üzerinden gerçekleştirir.

## Proje Yapısı

    blokchain_sertifika/
    │
    ├── client/ # Sertifika üretimi & doğrulama için CLI/Web istemci
    │ ├── src/
    │ ├── .env
    │ ├── .env.example
    │ ├── index.js
    │ ├── package.json
    │ └── package-lock.json
    │
    ├── dapp/ # Hardhat uygulaması
    │ ├── artifacts/
    │ ├── cache/
    │ ├── contracts/
    │ │ └── CertificateRegistry.sol
    │ ├── scripts/
    │ │ └── deploy.js
    │ ├── hardhat.config.js
    │ ├── package.json
    │ └── package-lock.json
    │
    ├── docker-compose.yml # Üç konteynerli mimari (ganache + hardhat + client)
    ├── README.md # Dokümantasyon
    └── başlatma.txt # Çalıştırma komutları
