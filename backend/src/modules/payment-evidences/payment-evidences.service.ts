import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PaymentEvidence, EvidenceStatus, EvidenceType } from './entities/payment-evidence.entity';
import { CreateEvidenceDto, ReviewEvidenceDto, QueryEvidencesDto } from './dto/evidence.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentEvidencesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'payment-evidences');

  constructor(
    @InjectRepository(PaymentEvidence)
    private evidenceRepository: Repository<PaymentEvidence>,
  ) {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  async uploadEvidence(
    file: Express.Multer.File,
    createDto: CreateEvidenceDto,
    userId: string,
  ): Promise<PaymentEvidence> {
    // Validar tipo de archivo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG) o PDF');
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo excede el tamaño máximo permitido (10MB)');
    }

    // Determinar tipo de evidencia
    const evidenceType = file.mimetype === 'application/pdf' ? EvidenceType.PDF : EvidenceType.IMAGE;

    // Generar nombre único
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Guardar archivo
    await fs.writeFile(filePath, file.buffer);

    // Crear registro en BD
    const evidence = this.evidenceRepository.create({
      clientId: createDto.clientId,
      uploadedBy: userId,
      fileName,
      filePath: `/uploads/payment-evidences/${fileName}`,
      fileType: file.mimetype,
      fileSize: file.size,
      evidenceType,
      paymentAmount: createDto.paymentAmount,
      paymentDate: new Date(createDto.paymentDate),
      notes: createDto.notes,
      metadata: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        campaignId: createDto.campaignId,
        referenceNumber: createDto.referenceNumber,
      },
    });

    return this.evidenceRepository.save(evidence);
  }

  async findAll(query: QueryEvidencesDto): Promise<PaymentEvidence[]> {
    const where: any = {};

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate && query.endDate) {
      where.paymentDate = Between(new Date(query.startDate), new Date(query.endDate));
    }

    return this.evidenceRepository.find({
      where,
      relations: ['client', 'uploader', 'reviewer'],
      order: { uploadedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PaymentEvidence> {
    const evidence = await this.evidenceRepository.findOne({
      where: { id },
      relations: ['client', 'uploader', 'reviewer'],
    });

    if (!evidence) {
      throw new NotFoundException(`Evidencia con ID ${id} no encontrada`);
    }

    return evidence;
  }

  async reviewEvidence(id: string, reviewDto: ReviewEvidenceDto, reviewerId: string): Promise<PaymentEvidence> {
    const evidence = await this.findOne(id);

    if (evidence.status !== EvidenceStatus.PENDING) {
      throw new BadRequestException('Esta evidencia ya fue revisada');
    }

    evidence.status = reviewDto.status === 'approved' ? EvidenceStatus.APPROVED : EvidenceStatus.REJECTED;
    evidence.reviewedBy = reviewerId;
    evidence.reviewedAt = new Date();
    evidence.reviewNotes = reviewDto.reviewNotes;

    return this.evidenceRepository.save(evidence);
  }

  async deleteEvidence(id: string): Promise<void> {
    const evidence = await this.findOne(id);

    // Eliminar archivo físico
    try {
      const fullPath = path.join(process.cwd(), evidence.filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
    }

    // Eliminar registro
    await this.evidenceRepository.remove(evidence);
  }

  async getEvidencesByClient(clientId: string): Promise<PaymentEvidence[]> {
    return this.evidenceRepository.find({
      where: { clientId },
      relations: ['uploader', 'reviewer'],
      order: { uploadedAt: 'DESC' },
    });
  }

  async getPendingCount(): Promise<number> {
    return this.evidenceRepository.count({
      where: { status: EvidenceStatus.PENDING },
    });
  }
}
