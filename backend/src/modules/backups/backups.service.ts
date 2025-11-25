// Backup Service - NGS&O CRM Gestión
// Servicio para creación y gestión de backups cifrados
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Backup, BackupStatus, BackupType } from './entities/backup.entity';
import { CreateBackupDto } from './dto/backup.dto';
import { EmailService } from '../../common/services/email.service';
import { User } from '../users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private readonly backupsPath: string;

  constructor(
    @InjectRepository(Backup)
    private backupRepo: Repository<Backup>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    // Crear directorio de backups si no existe
    this.backupsPath = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupsPath)) {
      fs.mkdirSync(this.backupsPath, { recursive: true });
    }
  }

  /**
   * Crear un nuevo backup
   */
  async createBackup(createBackupDto: CreateBackupDto, userId?: string): Promise<Backup> {
    this.logger.log(`Iniciando creación de backup tipo: ${createBackupDto.type || BackupType.MANUAL}`);

    // Generar contraseña maestra única
    const masterPassword = this.generateMasterPassword();
    const passwordHash = await bcrypt.hash(masterPassword, 12);

    // Crear registro del backup
    const backup = this.backupRepo.create({
      fileName: `backup_${Date.now()}.zip`,
      filePath: '',
      fileSize: 0,
      status: BackupStatus.PROCESSING,
      type: createBackupDto.type || BackupType.MANUAL,
      passwordHash,
      isEncrypted: true,
      createdById: userId,
    });

    const savedBackup = await this.backupRepo.save(backup);

    // Ejecutar backup en segundo plano
    this.executeBackup(savedBackup.id, masterPassword, userId)
      .catch(error => {
        this.logger.error(`Error en backup ${savedBackup.id}:`, error);
        this.updateBackupStatus(savedBackup.id, BackupStatus.FAILED, error.message);
      });

    // SEGURIDAD: NO retornar la contraseña maestra
    // La contraseña será enviada por email a gerencia únicamente
    return savedBackup;
  }

  /**
   * Ejecutar el proceso de backup
   */
  private async executeBackup(backupId: string, masterPassword: string, userId?: string): Promise<void> {
    const backup = await this.backupRepo.findOne({ where: { id: backupId } });
    if (!backup) throw new Error('Backup no encontrado');

    try {
      // 1. Crear dump de PostgreSQL
      const dbDumpPath = await this.createDatabaseDump();
      
      // 2. Copiar archivos de uploads
      const uploadsPath = path.join(process.cwd(), 'uploads');
      
      // 3. Crear archivo ZIP
      const zipPath = path.join(this.backupsPath, backup.fileName);
      await this.createZipArchive(zipPath, dbDumpPath, uploadsPath);
      
      // 4. Guardar tamaños antes de cifrar (necesarios para metadata)
      const databaseSize = fs.statSync(dbDumpPath).size;
      const filesSize = this.getDirectorySize(uploadsPath);
      
      // 5. Cifrar el archivo ZIP
      const encryptedPath = await this.encryptFile(zipPath, masterPassword);
      
      // 6. Limpiar archivos temporales
      fs.unlinkSync(dbDumpPath);
      fs.unlinkSync(zipPath);
      
      // 7. Actualizar registro
      const fileSize = fs.statSync(encryptedPath).size;
      backup.filePath = encryptedPath;
      backup.fileSize = fileSize;
      backup.status = BackupStatus.COMPLETED;
      backup.completedAt = new Date();
      backup.metadata = {
        databaseSize,
        filesSize,
        compressionRatio: this.calculateCompressionRatio(fileSize, databaseSize),
      };

      await this.backupRepo.save(backup);
      
      // 7. ENVIAR EMAIL CON CONTRASEÑA A GERENCIA
      try {
        // Obtener nombre del usuario que creó el backup
        let createdByName = 'Sistema Automático';
        if (userId) {
          const user = await this.userRepo.findOne({ where: { id: userId } });
          if (user) {
            createdByName = user.fullName || user.email;
          }
        }

        // Enviar email con la contraseña maestra (no bloquear el proceso si falla)
        await this.emailService.sendBackupPasswordEmail(
          backup.id,
          masterPassword,
          createdByName,
          backup.fileName,
        );
        
        this.logger.log(`📧 Email con contraseña maestra enviado a gerencia para backup ${backupId}`);
      } catch (emailError) {
        this.logger.error(`❌ Error enviando email para backup ${backupId}:`, emailError.message);
        // No fallar el backup si el email falla - el backup sigue siendo válido
      }
      
      this.logger.log(`✅ Backup ${backupId} completado exitosamente`);
      
    } catch (error) {
      this.logger.error(`❌ Error en backup ${backupId}:`, error);
      backup.status = BackupStatus.FAILED;
      backup.errorMessage = error.message;
      await this.backupRepo.save(backup);
      throw error;
    }
  }

  /**
   * Crear dump de la base de datos PostgreSQL
   */
  private async createDatabaseDump(): Promise<string> {
    const dbUser = this.configService.get('DB_USERNAME');
    const dbPassword = this.configService.get('DB_PASSWORD');
    const dbName = this.configService.get('DB_NAME');
    
    const dumpPath = path.join(this.backupsPath, `dump_${Date.now()}.sql`);
    
    // Detectar si PostgreSQL está en Docker (contenedor crm-postgres)
    const dockerContainer = 'crm-postgres';
    
    try {
      // Verificar si el contenedor Docker existe
      await execAsync(`docker inspect ${dockerContainer}`);
      this.logger.log(`🐳 Detectado PostgreSQL en Docker (${dockerContainer})`);
      
      // Ejecutar pg_dump dentro del contenedor y guardar el output
      const { stdout } = await execAsync(
        `docker exec -e PGPASSWORD=${dbPassword} ${dockerContainer} pg_dump -U ${dbUser} ${dbName}`,
      );
      
      // Escribir el dump al archivo
      fs.writeFileSync(dumpPath, stdout);
      this.logger.log(`✅ Database dump creado desde Docker: ${dumpPath}`);
      return dumpPath;
      
    } catch (dockerError) {
      // Si no está en Docker, intentar con pg_dump local
      this.logger.warn('⚠️ Contenedor Docker no encontrado, intentando pg_dump local...');
      
      const dbHost = this.configService.get('DB_HOST');
      const dbPort = this.configService.get('DB_PORT');
      
      // Buscar pg_dump en rutas comunes de PostgreSQL en Windows
      const pgDumpPaths = [
        'pg_dump', // Intentar primero en PATH
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      ];

      let pgDumpCommand = 'pg_dump';
      
      // Intentar encontrar pg_dump que exista
      for (const pgPath of pgDumpPaths) {
        if (fs.existsSync(pgPath)) {
          pgDumpCommand = `"${pgPath}"`;
          break;
        }
      }
      
      // Usar pg_dump con variables de entorno para evitar prompt de contraseña
      const env = {
        ...process.env,
        PGPASSWORD: dbPassword,
      };

      const command = `${pgDumpCommand} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p -f "${dumpPath}"`;
      
      try {
        await execAsync(command, { env });
        this.logger.log(`✅ Database dump creado: ${dumpPath}`);
        return dumpPath;
      } catch (error) {
        this.logger.error('❌ Error creando database dump:', error);
        this.logger.error(`💡 Tip: Asegúrate de que PostgreSQL esté en Docker (crm-postgres) o pg_dump esté en el PATH`);
        throw new Error(`Error al crear dump de base de datos: ${error.message}`);
      }
    }
  }

  /**
   * Crear archivo ZIP con todos los archivos
   */
  private createZipArchive(outputPath: string, ...inputPaths: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        this.logger.log(`✅ ZIP creado: ${outputPath} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', (err) => {
        this.logger.error('❌ Error creando ZIP:', err);
        reject(err);
      });

      archive.pipe(output);

      // Agregar archivos al ZIP
      for (const inputPath of inputPaths) {
        if (fs.existsSync(inputPath)) {
          const stats = fs.statSync(inputPath);
          if (stats.isDirectory()) {
            archive.directory(inputPath, path.basename(inputPath));
          } else {
            archive.file(inputPath, { name: path.basename(inputPath) });
          }
        }
      }

      archive.finalize();
    });
  }

  /**
   * Cifrar archivo con AES-256
   */
  private async encryptFile(filePath: string, password: string): Promise<string> {
    const inputData = fs.readFileSync(filePath);
    
    // Generar salt y IV
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Derivar clave usando PBKDF2
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    // Cifrar con AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(inputData), cipher.final()]);
    
    // Formato: [salt(32)] [iv(16)] [encrypted data]
    const outputData = Buffer.concat([salt, iv, encrypted]);
    
    const encryptedPath = filePath + '.enc';
    fs.writeFileSync(encryptedPath, outputData);
    
    this.logger.log(`🔒 Archivo cifrado: ${encryptedPath}`);
    return encryptedPath;
  }

  /**
   * Descifrar archivo con AES-256
   */
  private async decryptFile(filePath: string, password: string): Promise<Buffer> {
    const encryptedData = fs.readFileSync(filePath);
    
    // Extraer salt, IV y datos cifrados
    const salt = encryptedData.subarray(0, 32);
    const iv = encryptedData.subarray(32, 48);
    const encrypted = encryptedData.subarray(48);
    
    // Derivar clave usando el mismo proceso
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    // Descifrar
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted;
    } catch (error) {
      throw new BadRequestException('Contraseña incorrecta');
    }
  }

  /**
   * Generar contraseña maestra aleatoria
   */
  private generateMasterPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Obtener tamaño de un directorio
   */
  private getDirectorySize(dirPath: string): number {
    if (!fs.existsSync(dirPath)) return 0;
    
    let size = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += this.getDirectorySize(filePath);
      } else {
        size += fs.statSync(filePath).size;
      }
    }
    
    return size;
  }

  /**
   * Calcular ratio de compresión
   */
  private calculateCompressionRatio(compressedSize: number, originalSize: number): number {
    return Math.round((1 - compressedSize / originalSize) * 100);
  }

  /**
   * Actualizar estado del backup
   */
  private async updateBackupStatus(backupId: string, status: BackupStatus, errorMessage?: string): Promise<void> {
    await this.backupRepo.update(backupId, {
      status,
      errorMessage,
      completedAt: status === BackupStatus.COMPLETED ? new Date() : undefined,
    });
  }

  /**
   * Listar todos los backups
   */
  async findAll(): Promise<Backup[]> {
    return this.backupRepo.find({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener un backup por ID
   */
  async findOne(id: string): Promise<Backup> {
    const backup = await this.backupRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!backup) {
      throw new NotFoundException('Backup no encontrado');
    }

    return backup;
  }

  /**
   * Descargar backup (requiere contraseña)
   */
  async downloadBackup(id: string, password: string): Promise<{ buffer: Buffer; fileName: string }> {
    const backup = await this.findOne(id);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('El backup no está completado');
    }

    // Verificar contraseña
    const isValid = await bcrypt.compare(password, backup.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Contraseña incorrecta');
    }

    // Descifrar archivo
    const decryptedBuffer = await this.decryptFile(backup.filePath, password);

    return {
      buffer: decryptedBuffer,
      fileName: backup.fileName,
    };
  }

  /**
   * Eliminar backup
   */
  async remove(id: string): Promise<void> {
    const backup = await this.findOne(id);

    // Eliminar archivo físico
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    // Eliminar registro
    await this.backupRepo.remove(backup);
    
    this.logger.log(`🗑️ Backup ${id} eliminado`);
  }

  /**
   * Backup automático diario (2 AM)
   */
  @Cron('0 2 * * *')
  async handleDailyBackup() {
    this.logger.log('🕐 Ejecutando backup automático diario...');
    await this.createBackup({ type: BackupType.SCHEDULED });
  }
}
