import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebtorsService } from './debtors.service';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UploadCsvDto } from './dto/upload-csv.dto';
import { DocumentType } from './entities/debtor.entity';

@ApiTags('Debtors')
@ApiBearerAuth()
@Controller('debtors')
@UseGuards(JwtAuthGuard)
export class DebtorsController {
  private readonly logger = new Logger(DebtorsController.name);
  
  constructor(private readonly debtorsService: DebtorsService) {}

  /**
   * Crear deudor manualmente
   */
  @Post()
  @ApiOperation({ summary: 'Crear un deudor manualmente' })
  async create(@Body() createDebtorDto: CreateDebtorDto) {
    const debtor = await this.debtorsService.create(createDebtorDto);
    return {
      message: 'Deudor creado exitosamente',
      data: debtor,
    };
  }

  /**
   * Listar deudores con paginación
   */
  @Get()
  @ApiOperation({ summary: 'Listar todos los deudores' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const result = await this.debtorsService.findAll(+page, +limit);
    return {
      message: 'Deudores recuperados exitosamente',
      data: result.data,
      meta: {
        page: +page,
        limit: +limit,
        total: result.total,
        totalPages: Math.ceil(result.total / +limit),
      },
    };
  }

  /**
   * Buscar deudor por documento
   */
  @Get('search/:documentType/:documentNumber')
  @ApiOperation({ summary: 'Buscar deudor por tipo y número de documento' })
  async findByDocument(
    @Param('documentType') documentType: DocumentType,
    @Param('documentNumber') documentNumber: string,
  ) {
    const debtor = await this.debtorsService.findByDocument(documentType, documentNumber);
    
    if (!debtor) {
      return {
        message: 'Deudor no encontrado',
        data: null,
      };
    }

    return {
      message: 'Deudor encontrado',
      data: debtor,
    };
  }

  /**
   * Buscar deudor por teléfono
   */
  @Get('phone/:phone')
  @ApiOperation({ summary: 'Buscar deudor por número de teléfono' })
  async findByPhone(@Param('phone') phone: string) {
    const debtor = await this.debtorsService.findByPhone(phone);
    
    if (!debtor) {
      return {
        message: 'Deudor no encontrado',
        data: null,
      };
    }

    return {
      message: 'Deudor encontrado',
      data: debtor,
    };
  }

  /**
   * Cargar deudores desde CSV o Excel
   */
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Cargar deudores masivamente desde archivo CSV o Excel',
    description: `
    Sube un archivo CSV o Excel (.xlsx, .xls) con la información de los deudores.
    
    Columnas requeridas:
    - nombre / fullName: Nombre completo del deudor
    - tipo_doc / documentType: Tipo de documento (CC, CE, NIT, TI, PASSPORT)
    - documento / documentNumber: Número de documento
    
    Columnas opcionales:
    - telefono / phone: Número de teléfono
    - correo / email: Correo electrónico
    - direccion / address: Dirección
    - deuda / debtAmount: Monto de la deuda
    - deuda_inicial / initialDebtAmount: Deuda inicial
    - mora / daysOverdue: Días de mora
    - ultimo_pago / lastPaymentDate: Fecha del último pago
    - promesa / promiseDate: Fecha de promesa de pago
    - estado / status: Estado del deudor
    - notas / notes: Observaciones
    - producto: Producto financiero
    - credito / numeroCredito: Número de crédito
    - vencimiento / fechaVencimiento: Fecha de vencimiento
    - compania: Compañía
    - campana / campaignId: ID de campaña
    `
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo CSV o Excel (.xlsx, .xls)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Formato de archivo no válido. Solo se permiten CSV y Excel'), false);
      }
    },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        success: false,
        message: 'No se proporcionó ningún archivo',
      };
    }

    this.logger.log(`📁 Procesando archivo: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);

    const result = await this.debtorsService.uploadFromFile(file.buffer, file.originalname);

    const message = result.success
      ? 'Archivo procesado exitosamente'
      : 'Archivo procesado con errores';

    return {
      success: result.success,
      message,
      data: result,
    };
  }

  /**
   * Cargar deudores desde CSV (legacy endpoint para compatibilidad)
   */
  @Post('upload-csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cargar deudores desde CSV (usar /upload en su lugar)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadCsvDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: any) {
    if (!file) {
      return {
        success: false,
        message: 'No se proporcionó ningún archivo',
      };
    }

    const result = await this.debtorsService.uploadFromCsv(file.buffer);

    return {
      message: 'CSV procesado exitosamente',
      data: {
        created: result.created,
        updated: result.updated,
        errorsCount: result.errors.length,
        errors: result.errors.slice(0, 10),
      },
    };
  }
}
