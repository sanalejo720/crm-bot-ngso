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
   * Cargar deudores desde CSV
   */
  @Post('upload-csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cargar deudores masivamente desde archivo CSV' })
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
        errors: result.errors.slice(0, 10), // Mostrar solo primeros 10 errores
      },
    };
  }
}
