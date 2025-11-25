# 📅 Cronograma Detallado - Semana 3 (EXTENDIDO)
**NGS&O CRM Gestión**  
**Fecha inicio:** 24 de Noviembre, 2025  
**Fecha fin:** 30 de Noviembre, 2025

---

## 🎯 NUEVOS REQUISITOS CRÍTICOS

### 📊 Módulo de Estadísticas Financieras (Admin Panel)
**Prioridad: 🔴 CRÍTICA**  
**Tiempo estimado: 12 horas**

#### Requisitos Funcionales:

**1. Dashboard Financiero por Campaña**
- Total a recuperar por campaña
- Total recuperado (pagos confirmados)
- Total en promesas de pago (comprometido)
- Porcentaje de recuperación (%)
- Gráficas de tendencias

**2. Dashboard de Recaudo por Agente**
- Recaudo total por agente
- Cantidad de pagos gestionados
- Promesas de pago por agente
- Porcentaje de efectividad
- Ranking de agentes por recaudo

**3. Filtros Temporales Avanzados**
- Vista diaria (hoy)
- Vista semanal (última semana)
- Vista mensual (mes actual)
- Rango de fechas personalizado (date picker inicio-fin)
- Comparativa vs período anterior

**4. Módulo de Evidencias de Pago**
- Upload de comprobantes (imagen/PDF)
- Asociar evidencia a pago específico
- Galería de evidencias por cliente
- Descarga de evidencias
- Estado: Pendiente revisión / Aprobado / Rechazado
- Notas del revisor

---

### 🔒 Módulo de IT - Backups Cifrados
**Prioridad: 🔴 CRÍTICA**  
**Tiempo estimado: 16 horas**

#### Requisitos de Seguridad:

**1. Sistema de Backups Automatizados**
```typescript
// Contenido del backup:
- Base de datos completa (PostgreSQL dump)
- Chats y mensajes
- Archivos multimedia (imágenes, audios, documentos)
- Logs de auditoría
- Configuraciones del sistema
```

**2. Cifrado de Backups**
```typescript
// Proceso de cifrado:
1. Generar contraseña maestra única (one-time)
2. Hashear con bcrypt (costo 12)
3. Cifrar archivo ZIP con AES-256
4. Enviar hash a email de gerencia
5. Contraseña NO se almacena en BD
6. Solo Super Admin puede descargar
```

**3. Características del Módulo IT**
- Panel exclusivo para rol "IT" o "Super Admin"
- Botón "Crear Backup Ahora"
- Lista de backups históricos con fechas
- Tamaño del archivo
- Estado: Procesando / Completado / Error
- Descarga directa (solo con contraseña)
- Programación automática (diaria/semanal)

**4. Proceso de Restauración**
```typescript
// Seguridad de restauración:
1. Super Admin solicita restauración
2. Sistema pide contraseña maestra
3. Verificar hash (no hay recuperación si se pierde)
4. Descargar y descifrar backup
5. Opción: restaurar completo o selectivo
6. Registrar en audit_logs
```

---

## 📊 Resumen de Horas - Semana 3

| Módulo | Horas | Prioridad |
|--------|-------|-----------|
| **Dashboard Financiero** | 12h | 🔴 Crítica |
| **Evidencias de Pago** | 6h | 🔴 Crítica |
| **Sistema de Backups IT** | 16h | 🔴 Crítica |
| RoleManagement (pendiente S2) | 4h | 🔴 Alta |
| Task Management (pendiente S2) | 4h | 🟡 Media |
| Notificaciones (pendiente S2) | 3h | 🟡 Media |
| Testing Integral | 10h | 🔴 Alta |
| **TOTAL** | **55 horas** | **~8h/día** |

---

## Lunes 24 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 📊 Dashboard Financiero - Backend (Parte 1)
**Tiempo: 4 horas**

**Tareas:**

1. **Crear FinancialStatsService** (backend)
```typescript
// src/modules/reports/services/financial-stats.service.ts

async getCampaignFinancials(
  campaignId: string,
  startDate: Date,
  endDate: Date
): Promise<CampaignFinancials> {
  return {
    campaignId,
    campaignName: string,
    totalToRecover: number,      // Suma de deudas de clientes en campaña
    totalRecovered: number,       // Suma de pagos confirmados
    totalInPromises: number,      // Suma de promesas pendientes
    recoveryPercentage: number,   // (recovered / toRecover) * 100
    paymentsCount: number,
    promisesCount: number,
    clientsWithDebt: number,
    clientsPaid: number,
  };
}

async getAgentRecaudo(
  agentId: string,
  startDate: Date,
  endDate: Date
): Promise<AgentRecaudo> {
  return {
    agentId,
    agentName: string,
    totalRecovered: number,
    paymentsCount: number,
    promisesCount: number,
    totalInPromises: number,
    effectivenessRate: number,    // (recovered / promises) * 100
    averageTicket: number,         // promedio de pago
    clientsAttended: number,
  };
}

async getDailyFinancials(date: Date): Promise<DailyFinancials>;
async getWeeklyFinancials(startDate: Date): Promise<WeeklyFinancials>;
async getMonthlyFinancials(year: number, month: number): Promise<MonthlyFinancials>;
```

2. **Crear endpoints en FinancialController**
```typescript
GET /api/v1/financial/campaigns/:id/stats?startDate&endDate
GET /api/v1/financial/agents/:id/recaudo?startDate&endDate
GET /api/v1/financial/daily?date
GET /api/v1/financial/weekly?startDate
GET /api/v1/financial/monthly?year&month
GET /api/v1/financial/range?startDate&endDate
GET /api/v1/financial/ranking/agents?period
```

3. **Queries SQL necesarias**
```sql
-- Total a recuperar por campaña
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  SUM(cl.total_debt) as total_to_recover,
  COUNT(DISTINCT cl.id) as clients_count
FROM campaigns c
LEFT JOIN chats ch ON ch.campaign_id = c.id
LEFT JOIN clients cl ON cl.id = ch.client_id
WHERE c.id = $1
  AND ch.created_at BETWEEN $2 AND $3
GROUP BY c.id, c.name;

-- Total recuperado (pagos confirmados)
SELECT 
  SUM(pp.amount) as total_recovered,
  COUNT(pp.id) as payments_count
FROM payment_promises pp
WHERE pp.campaign_id = $1
  AND pp.status = 'CUMPLIDA'
  AND pp.payment_date BETWEEN $2 AND $3;

-- Total en promesas pendientes
SELECT 
  SUM(pp.amount) as total_in_promises,
  COUNT(pp.id) as promises_count
FROM payment_promises pp
WHERE pp.campaign_id = $1
  AND pp.status IN ('PENDIENTE', 'CONFIRMADA')
  AND pp.promise_date BETWEEN $2 AND $3;
```

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 📊 Dashboard Financiero - Backend (Parte 2)
**Tiempo: 4 horas**

**Tareas:**

1. **Crear DTOs**
```typescript
// src/modules/reports/dto/financial-stats.dto.ts
export class CampaignFinancialsDto {
  campaignId: string;
  campaignName: string;
  totalToRecover: number;
  totalRecovered: number;
  totalInPromises: number;
  recoveryPercentage: number;
  paymentsCount: number;
  promisesCount: number;
  clientsWithDebt: number;
  clientsPaid: number;
  trend: 'up' | 'down' | 'stable';
}

export class AgentRecaudoDto {
  agentId: string;
  agentName: string;
  totalRecovered: number;
  paymentsCount: number;
  promisesCount: number;
  totalInPromises: number;
  effectivenessRate: number;
  averageTicket: number;
  clientsAttended: number;
  ranking: number;
}

export class FinancialSummaryDto {
  period: string;
  totalToRecover: number;
  totalRecovered: number;
  totalInPromises: number;
  globalRecoveryRate: number;
  campaignsStats: CampaignFinancialsDto[];
  topAgents: AgentRecaudoDto[];
}
```

2. **Testing de endpoints con Postman**
- Crear colección "Financial Stats"
- Probar cada endpoint con datos reales
- Verificar cálculos matemáticos
- Validar filtros de fecha

3. **Documentación Swagger**
```typescript
@ApiTags('financial')
@ApiBearerAuth()
@Controller('financial')
export class FinancialController {
  
  @Get('summary')
  @ApiOperation({ summary: 'Resumen financiero global' })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly', 'custom'] })
  @RequirePermissions({ module: 'reports', action: 'read' })
  async getFinancialSummary(
    @Query('period') period: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) { ... }
}
```

---

## Martes 25 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 📊 Dashboard Financiero - Frontend (Parte 1)
**Tiempo: 4 horas**

**Tareas:**

1. **Crear FinancialDashboard.tsx**
```typescript
// src/pages/FinancialDashboard.tsx
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  DatePicker,
} from '@mui/material';
import { TrendingUp, AttachMoney, People } from '@mui/icons-material';

export default function FinancialDashboard() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [financialData, setFinancialData] = useState<FinancialSummaryDto | null>(null);

  // KPIs principales en cards
  return (
    <Box>
      {/* Selector de período */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <MenuItem value="daily">Hoy</MenuItem>
          <MenuItem value="weekly">Esta Semana</MenuItem>
          <MenuItem value="monthly">Este Mes</MenuItem>
          <MenuItem value="custom">Rango Personalizado</MenuItem>
        </Select>
        
        {period === 'custom' && (
          <>
            <DatePicker label="Desde" value={startDate} onChange={setStartDate} />
            <DatePicker label="Hasta" value={endDate} onChange={setEndDate} />
          </>
        )}
      </Box>

      {/* KPIs Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'info.light' }}>
            <CardContent>
              <Typography color="white" variant="h6">Total a Recuperar</Typography>
              <Typography color="white" variant="h3">
                ${financialData?.totalToRecover.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography color="white" variant="h6">Total Recuperado</Typography>
              <Typography color="white" variant="h3">
                ${financialData?.totalRecovered.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography color="white" variant="h6">En Promesas</Typography>
              <Typography color="white" variant="h3">
                ${financialData?.totalInPromises.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'primary.light' }}>
            <CardContent>
              <Typography color="white" variant="h6">% Recuperación</Typography>
              <Typography color="white" variant="h3">
                {financialData?.globalRecoveryRate.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráfica de campañas */}
      {/* Tabla de agentes con recaudo */}
    </Box>
  );
}
```

2. **Instalar dependencias para gráficas**
```powershell
npm install recharts
npm install @mui/x-date-pickers
npm install dayjs
```

3. **Crear componentes auxiliares**
```typescript
// src/components/financial/CampaignFinancialCard.tsx
// src/components/financial/AgentRecaudoTable.tsx
// src/components/financial/RecoveryTrendChart.tsx (Line Chart)
// src/components/financial/CampaignPieChart.tsx (Pie Chart)
```

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 📊 Dashboard Financiero - Frontend (Parte 2)
**Tiempo: 4 horas**

**Tareas:**

1. **Implementar gráficas con Recharts**
```typescript
// Gráfica de tendencia de recuperación
<LineChart data={trendData}>
  <Line dataKey="recovered" stroke="#4caf50" name="Recuperado" />
  <Line dataKey="promises" stroke="#ff9800" name="Promesas" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
</LineChart>

// Pie Chart de campañas
<PieChart>
  <Pie data={campaignsData} dataKey="recovered" nameKey="name">
    {campaignsData.map((entry, index) => (
      <Cell key={index} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

2. **Tabla de ranking de agentes**
```typescript
<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>#</TableCell>
        <TableCell>Agente</TableCell>
        <TableCell align="right">Recuperado</TableCell>
        <TableCell align="right">Pagos</TableCell>
        <TableCell align="right">Promesas</TableCell>
        <TableCell align="right">Efectividad</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {agentsRanking.map((agent, index) => (
        <TableRow key={agent.agentId}>
          <TableCell>
            <Chip 
              label={index + 1} 
              color={index === 0 ? 'warning' : index < 3 ? 'info' : 'default'} 
            />
          </TableCell>
          <TableCell>{agent.agentName}</TableCell>
          <TableCell align="right">
            <Typography fontWeight="bold" color="success.main">
              ${agent.totalRecovered.toLocaleString()}
            </Typography>
          </TableCell>
          <TableCell align="right">{agent.paymentsCount}</TableCell>
          <TableCell align="right">{agent.promisesCount}</TableCell>
          <TableCell align="right">
            <Chip 
              label={`${agent.effectivenessRate.toFixed(1)}%`}
              color={agent.effectivenessRate > 70 ? 'success' : 'warning'}
            />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

3. **Integración con API**
- Conectar a endpoints de financial
- Actualizar datos cada 30 segundos
- Loading states
- Error handling

---

## Miércoles 26 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 💰 Módulo de Evidencias de Pago - Backend
**Tiempo: 4 horas**

**Tareas:**

1. **Crear entidad PaymentEvidence**
```typescript
// src/modules/payments/entities/payment-evidence.entity.ts
@Entity('payment_evidences')
export class PaymentEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentPromise)
  @JoinColumn({ name: 'payment_promise_id' })
  paymentPromise: PaymentPromise;

  @Column()
  paymentPromiseId: string;

  @Column()
  fileName: string;

  @Column()
  fileType: string; // 'image/jpeg', 'application/pdf'

  @Column()
  fileSize: number; // en bytes

  @Column()
  filePath: string; // ruta en servidor o URL S3

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column()
  uploadedById: string;

  @CreateDateColumn()
  uploadedAt: Date;
}
```

2. **Crear PaymentEvidencesService**
```typescript
// src/modules/payments/payment-evidences.service.ts
async uploadEvidence(
  paymentPromiseId: string,
  file: Express.Multer.File,
  uploadedById: string,
): Promise<PaymentEvidence> {
  // Validar tipo de archivo (jpg, png, pdf)
  // Validar tamaño máximo (5MB)
  // Guardar archivo en /uploads/evidences/
  // Crear registro en BD
  // Retornar evidencia creada
}

async getEvidencesByPayment(paymentPromiseId: string): Promise<PaymentEvidence[]>;

async getEvidencesByClient(clientId: string): Promise<PaymentEvidence[]>;

async reviewEvidence(
  evidenceId: string,
  status: 'APPROVED' | 'REJECTED',
  notes: string,
  reviewerId: string,
): Promise<PaymentEvidence>;

async downloadEvidence(evidenceId: string): Promise<{ path: string; fileName: string }>;
```

3. **Crear endpoints**
```typescript
// src/modules/payments/payment-evidences.controller.ts
@ApiTags('payment-evidences')
@Controller('payment-evidences')
export class PaymentEvidencesController {
  
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/evidences',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Solo se permiten imágenes y PDFs'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }))
  @RequirePermissions({ module: 'payments', action: 'create' })
  async uploadEvidence(
    @UploadedFile() file: Express.Multer.File,
    @Body('paymentPromiseId') paymentPromiseId: string,
    @CurrentUser() user: User,
  ) { ... }

  @Get('payment/:paymentId')
  @RequirePermissions({ module: 'payments', action: 'read' })
  async getByPayment(@Param('paymentId') paymentId: string) { ... }

  @Get('client/:clientId')
  @RequirePermissions({ module: 'payments', action: 'read' })
  async getByClient(@Param('clientId') clientId: string) { ... }

  @Patch(':id/review')
  @RequirePermissions({ module: 'payments', action: 'update' })
  async reviewEvidence(
    @Param('id') id: string,
    @Body() reviewDto: ReviewEvidenceDto,
    @CurrentUser() user: User,
  ) { ... }

  @Get(':id/download')
  @RequirePermissions({ module: 'payments', action: 'read' })
  async downloadEvidence(@Param('id') id: string, @Res() res: Response) {
    const { path, fileName } = await this.service.downloadEvidence(id);
    res.download(path, fileName);
  }
}
```

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 💰 Módulo de Evidencias de Pago - Frontend
**Tiempo: 4 horas**

**Tareas:**

1. **Crear EvidenceUploadDialog.tsx**
```typescript
// src/components/payments/EvidenceUploadDialog.tsx
export default function EvidenceUploadDialog({ paymentId, open, onClose }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Generar preview si es imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('paymentPromiseId', paymentId);

    await api.post('/payment-evidences/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Subir Evidencia de Pago</DialogTitle>
      <DialogContent>
        <Button variant="outlined" component="label">
          Seleccionar Archivo
          <input type="file" hidden accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
        </Button>
        
        {preview && <Box mt={2}><img src={preview} alt="Preview" style={{ maxWidth: '100%' }} /></Box>}
        
        {selectedFile && (
          <Typography mt={2}>
            Archivo: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleUpload} variant="contained" disabled={!selectedFile}>
          Subir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

2. **Crear EvidenceGallery.tsx**
```typescript
// src/components/payments/EvidenceGallery.tsx
export default function EvidenceGallery({ clientId }) {
  const [evidences, setEvidences] = useState<PaymentEvidence[]>([]);

  useEffect(() => {
    loadEvidences();
  }, [clientId]);

  const loadEvidences = async () => {
    const response = await api.get(`/payment-evidences/client/${clientId}`);
    setEvidences(response.data);
  };

  const handleDownload = async (evidenceId: string) => {
    const response = await api.get(`/payment-evidences/${evidenceId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `evidencia-${evidenceId}.pdf`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <Box>
      <Typography variant="h6" mb={2}>Evidencias de Pago</Typography>
      <Grid container spacing={2}>
        {evidences.map((evidence) => (
          <Grid item xs={6} md={4} key={evidence.id}>
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={evidence.fileType.startsWith('image') ? evidence.filePath : '/pdf-icon.png'}
                alt={evidence.fileName}
              />
              <CardContent>
                <Typography variant="caption">{evidence.fileName}</Typography>
                <Chip 
                  label={evidence.status} 
                  size="small" 
                  color={evidence.status === 'APPROVED' ? 'success' : 'warning'}
                />
              </CardContent>
              <CardActions>
                <IconButton onClick={() => handleDownload(evidence.id)}>
                  <DownloadIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

3. **Integrar en DebtorPanel**
- Botón "Adjuntar Evidencia" en sección de promesas
- Mostrar galería de evidencias del cliente
- Indicador visual de evidencias pendientes de revisión

---

## Jueves 27 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 🔒 Sistema de Backups Cifrados - Backend (Parte 1)
**Tiempo: 4 horas**

**Tareas:**

1. **Instalar dependencias de cifrado**
```powershell
cd D:\crm-ngso-whatsapp\backend
npm install archiver adm-zip node-7z bcryptjs
npm install --save-dev @types/archiver @types/adm-zip @types/bcryptjs
```

2. **Crear BackupService**
```typescript
// src/modules/backups/backups.service.ts
import * as archiver from 'archiver';
import * as AdmZip from 'adm-zip';
import * as bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupsService {
  
  // Generar contraseña maestra única (solo primera vez)
  async generateMasterPassword(): Promise<string> {
    const masterPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(masterPassword, 12);
    
    // Guardar hash en tabla system_config
    await this.systemConfigRepo.save({
      key: 'BACKUP_MASTER_PASSWORD_HASH',
      value: hashedPassword,
      isSecret: true,
    });

    // Enviar por email a gerencia
    await this.emailService.send({
      to: process.env.GERENCIA_EMAIL,
      subject: 'Contraseña Maestra de Backups - NGS&O CRM',
      body: `
        CONTRASEÑA MAESTRA PARA BACKUPS CIFRADOS:
        
        ${masterPassword}
        
        IMPORTANTE:
        - Esta contraseña es ÚNICA y NO se puede recuperar si se pierde
        - Guárdela en un lugar seguro
        - Solo el Super Admin puede descargar backups
        - Se requiere esta contraseña para descifrar cualquier backup
      `,
    });

    return masterPassword;
  }

  // Crear backup completo cifrado
  async createEncryptedBackup(): Promise<Backup> {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupDir = `./backups/${backupId}`;
    const zipPath = `${backupDir}/backup-${timestamp}.zip`;

    // 1. Crear directorio temporal
    await fs.promises.mkdir(backupDir, { recursive: true });

    // 2. Exportar base de datos PostgreSQL
    const dbDumpPath = `${backupDir}/database.sql`;
    await execAsync(`pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -d ${process.env.DB_NAME} -f ${dbDumpPath}`);

    // 3. Copiar archivos multimedia
    await this.copyDirectory('./uploads', `${backupDir}/uploads`);

    // 4. Exportar logs de auditoría
    const logs = await this.auditLogsRepo.find();
    await fs.promises.writeFile(
      `${backupDir}/audit_logs.json`,
      JSON.stringify(logs, null, 2)
    );

    // 5. Exportar configuraciones
    const configs = await this.systemConfigRepo.find();
    await fs.promises.writeFile(
      `${backupDir}/configs.json`,
      JSON.stringify(configs, null, 2)
    );

    // 6. Crear ZIP sin cifrar
    await this.createZip(backupDir, zipPath);

    // 7. Obtener contraseña maestra hasheada
    const masterPasswordHash = await this.systemConfigRepo.findOne({
      where: { key: 'BACKUP_MASTER_PASSWORD_HASH' },
    });

    if (!masterPasswordHash) {
      throw new Error('No existe contraseña maestra. Generar primero.');
    }

    // 8. Cifrar ZIP con AES-256 usando 7z
    const encryptedPath = `${zipPath}.7z`;
    await execAsync(`7z a -p${masterPasswordHash.value} -mhe=on ${encryptedPath} ${zipPath}`);

    // 9. Eliminar ZIP sin cifrar y archivos temporales
    await fs.promises.rm(zipPath);
    await fs.promises.rm(`${backupDir}/database.sql`);
    await fs.promises.rm(`${backupDir}/audit_logs.json`);
    await fs.promises.rm(`${backupDir}/configs.json`);
    await fs.promises.rm(`${backupDir}/uploads`, { recursive: true });

    // 10. Calcular tamaño del archivo cifrado
    const stats = await fs.promises.stat(encryptedPath);

    // 11. Guardar registro en BD
    const backup = await this.backupRepo.save({
      id: backupId,
      fileName: `backup-${timestamp}.7z`,
      filePath: encryptedPath,
      fileSize: stats.size,
      status: 'COMPLETED',
      createdAt: new Date(),
    });

    return backup;
  }

  // Verificar contraseña maestra antes de descargar
  async verifyMasterPassword(providedPassword: string): Promise<boolean> {
    const masterPasswordHash = await this.systemConfigRepo.findOne({
      where: { key: 'BACKUP_MASTER_PASSWORD_HASH' },
    });

    if (!masterPasswordHash) {
      throw new Error('No existe contraseña maestra configurada');
    }

    return await bcrypt.compare(providedPassword, masterPasswordHash.value);
  }

  // Descifrar y descargar backup
  async downloadBackup(backupId: string, password: string): Promise<string> {
    // Verificar contraseña
    const isValid = await this.verifyMasterPassword(password);
    if (!isValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Obtener backup
    const backup = await this.backupRepo.findOne({ where: { id: backupId } });
    if (!backup) {
      throw new NotFoundException('Backup no encontrado');
    }

    return backup.filePath; // Retornar ruta para descarga directa
  }

  // Listar backups históricos
  async listBackups(): Promise<Backup[]> {
    return await this.backupRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  // Programar backup automático
  @Cron('0 2 * * *') // Todos los días a las 2 AM
  async scheduledBackup() {
    try {
      await this.createEncryptedBackup();
      this.logger.log('Backup automático completado exitosamente');
    } catch (error) {
      this.logger.error('Error en backup automático', error);
    }
  }

  private async createZip(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }
}
```

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 🔒 Sistema de Backups Cifrados - Backend (Parte 2)
**Tiempo: 4 horas**

**Tareas:**

1. **Crear entidad Backup**
```typescript
// src/modules/backups/entities/backup.entity.ts
@Entity('system_backups')
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column({ type: 'bigint' })
  fileSize: number; // en bytes

  @Column({ type: 'enum', enum: ['PROCESSING', 'COMPLETED', 'FAILED'], default: 'PROCESSING' })
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ default: false })
  isAutomatic: boolean; // true si fue programado, false si manual

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  downloadedAt: Date; // Última descarga

  @Column({ default: 0 })
  downloadCount: number;
}
```

2. **Crear BackupsController**
```typescript
// src/modules/backups/backups.controller.ts
@ApiTags('backups')
@ApiBearerAuth()
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post('create')
  @RequirePermissions({ module: 'system', action: 'admin' })
  @ApiOperation({ summary: 'Crear backup cifrado ahora (solo Super Admin)' })
  async createBackup(@CurrentUser() user: User) {
    if (user.role.name !== 'Super Admin') {
      throw new ForbiddenException('Solo Super Admin puede crear backups');
    }

    const backup = await this.backupsService.createEncryptedBackup();
    return {
      success: true,
      message: 'Backup creado exitosamente',
      data: backup,
    };
  }

  @Get('list')
  @RequirePermissions({ module: 'system', action: 'admin' })
  @ApiOperation({ summary: 'Listar backups históricos' })
  async listBackups() {
    const backups = await this.backupsService.listBackups();
    return { success: true, data: backups };
  }

  @Post('download/:id')
  @RequirePermissions({ module: 'system', action: 'admin' })
  @ApiOperation({ summary: 'Descargar backup cifrado con contraseña' })
  async downloadBackup(
    @Param('id') id: string,
    @Body('password') password: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    if (user.role.name !== 'Super Admin') {
      throw new ForbiddenException('Solo Super Admin puede descargar backups');
    }

    const filePath = await this.backupsService.downloadBackup(id, password);
    const fileName = path.basename(filePath);

    res.download(filePath, fileName);
  }

  @Post('generate-master-password')
  @RequirePermissions({ module: 'system', action: 'admin' })
  @ApiOperation({ summary: 'Generar contraseña maestra (solo primera vez)' })
  async generateMasterPassword(@CurrentUser() user: User) {
    if (user.role.name !== 'Super Admin') {
      throw new ForbiddenException('Solo Super Admin');
    }

    // Verificar que no exista ya
    const existing = await this.backupsService.checkMasterPasswordExists();
    if (existing) {
      throw new BadRequestException('Ya existe una contraseña maestra');
    }

    await this.backupsService.generateMasterPassword();
    
    return {
      success: true,
      message: 'Contraseña maestra generada y enviada por email a gerencia',
    };
  }

  @Get('scheduled/status')
  @RequirePermissions({ module: 'system', action: 'admin' })
  @ApiOperation({ summary: 'Ver estado de backups programados' })
  async getScheduledStatus() {
    const cronStatus = this.backupsService.getCronStatus();
    return { success: true, data: cronStatus };
  }
}
```

3. **Crear migration para tabla**
```bash
npm run migration:create --name=CreateBackupsTable
```

4. **Testing de backups**
- Crear backup manual
- Verificar cifrado con 7z
- Intentar descarga sin contraseña (debe fallar)
- Descarga con contraseña correcta
- Verificar contenido del backup descifrado

---

## Viernes 28 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 🔒 Sistema de Backups Cifrados - Frontend
**Tiempo: 4 horas**

**Tareas:**

1. **Crear ITBackupsPage.tsx**
```typescript
// src/pages/ITBackupsPage.tsx
export default function ITBackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [creating, setCreating] = useState(false);
  const [downloadDialog, setDownloadDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [password, setPassword] = useState('');

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.post('/backups/create');
      alert('Backup creado exitosamente');
      loadBackups();
    } catch (error) {
      alert('Error al crear backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.post(`/backups/download/${selectedBackup.id}`, {
        password,
      }, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedBackup.fileName);
      document.body.appendChild(link);
      link.click();
      
      setDownloadDialog(false);
      setPassword('');
    } catch (error) {
      alert('Contraseña incorrecta o error al descargar');
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <ModernSidebar />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <AppHeader />
        <Box sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              🔒 Gestión de Backups Cifrados
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<BackupIcon />}
              onClick={handleCreateBackup}
              disabled={creating}
            >
              {creating ? <CircularProgress size={24} /> : 'Crear Backup Ahora'}
            </Button>
          </Box>

          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>Importante:</strong> Los backups están cifrados con AES-256. 
            Se requiere la contraseña maestra para descargarlos. 
            Esta contraseña fue enviada por email a gerencia.
          </Alert>

          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Historial de Backups</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Archivo</TableCell>
                      <TableCell>Tamaño</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>{new Date(backup.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {backup.fileName}
                          </Typography>
                        </TableCell>
                        <TableCell>{(backup.fileSize / (1024 * 1024)).toFixed(2)} MB</TableCell>
                        <TableCell>
                          <Chip 
                            label={backup.status} 
                            color={backup.status === 'COMPLETED' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={backup.isAutomatic ? 'Automático' : 'Manual'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Descargar (requiere contraseña)">
                            <IconButton
                              color="primary"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setDownloadDialog(true);
                              }}
                              disabled={backup.status !== 'COMPLETED'}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Dialog de contraseña */}
          <Dialog open={downloadDialog} onClose={() => setDownloadDialog(false)}>
            <DialogTitle>Ingresar Contraseña Maestra</DialogTitle>
            <DialogContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Esta contraseña fue enviada por email a gerencia cuando se configuró el sistema.
              </Alert>
              <TextField
                type="password"
                fullWidth
                label="Contraseña Maestra"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDownloadDialog(false)}>Cancelar</Button>
              <Button onClick={handleDownload} variant="contained">
                Descargar
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
```

2. **Agregar ruta en App.tsx**
```typescript
<Route element={<RoleGuard allowedRoles={['Super Admin']} />}>
  <Route path="/it/backups" element={<ITBackupsPage />} />
</Route>
```

3. **Agregar item en ModernSidebar**
```typescript
{
  id: 'it-backups',
  label: 'Backups',
  icon: <BackupIcon />,
  path: '/it/backups',
  roles: ['Super Admin'],
}
```

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 🧪 Testing Integral de Nuevas Funcionalidades
**Tiempo: 4 horas**

**Checklist de Testing:**

**1. Dashboard Financiero**
- [ ] Ver total a recuperar por campaña
- [ ] Ver total recuperado actualizado en tiempo real
- [ ] Ver promesas de pago pendientes
- [ ] Filtro diario muestra datos de hoy
- [ ] Filtro semanal muestra últimos 7 días
- [ ] Filtro mensual muestra mes actual
- [ ] Rango personalizado funciona correctamente
- [ ] Gráficas se renderizan sin errores
- [ ] Ranking de agentes muestra datos correctos
- [ ] Exportar a Excel funciona

**2. Evidencias de Pago**
- [ ] Subir imagen de comprobante
- [ ] Subir PDF de comprobante
- [ ] Rechazo de archivos no permitidos
- [ ] Límite de 5MB se respeta
- [ ] Ver galería de evidencias por cliente
- [ ] Descargar evidencia
- [ ] Revisar evidencia (aprobar/rechazar)
- [ ] Notificación al agente cuando se revisa

**3. Sistema de Backups**
- [ ] Crear backup manual
- [ ] Verificar que archivo se crea en /backups
- [ ] Verificar que está cifrado (no se puede abrir sin contraseña)
- [ ] Listar backups históricos
- [ ] Descargar backup con contraseña correcta
- [ ] Rechazar descarga con contraseña incorrecta
- [ ] Verificar que solo Super Admin tiene acceso
- [ ] Verificar cron job programado (revisar logs)
- [ ] Descifrar backup descargado con 7z

**4. Permisos y Seguridad**
- [ ] Solo Super Admin puede crear backups
- [ ] Solo Super Admin puede descargar backups
- [ ] Solo Supervisor+ puede ver dashboard financiero
- [ ] Agentes pueden subir evidencias
- [ ] Supervisor+ puede revisar evidencias

---

## Sábado 29 de Noviembre (Opcional)

### Refinamiento y Optimización (4 horas)

**Tareas:**
- [ ] Pulir UI de dashboard financiero
- [ ] Optimizar queries SQL lentas
- [ ] Agregar índices a tablas payment_promises
- [ ] Mejorar mensajes de error
- [ ] Agregar tooltips explicativos
- [ ] Testing de carga con 1000+ chats

---

## Domingo 30 de Noviembre

### Documentación y Preparación (3 horas)

**Tareas:**
- [ ] Actualizar README.md con nuevas funcionalidades
- [ ] Documentar endpoints en Swagger
- [ ] Crear guía de usuario para módulo financiero
- [ ] Crear guía de usuario para evidencias de pago
- [ ] Crear guía técnica de backups cifrados
- [ ] Preparar demo para stakeholders

---

## 📈 Métricas de Éxito - Semana 3

Al final de esta semana, el CRM debe tener:

✅ **Dashboard Financiero completo:**
- Métricas por campaña
- Métricas por agente
- Filtros temporales
- Gráficas de tendencias
- Ranking de agentes

✅ **Módulo de Evidencias:**
- Upload de comprobantes
- Galería por cliente
- Sistema de revisión
- Descarga de evidencias

✅ **Sistema de Backups:**
- Backups cifrados con AES-256
- Contraseña maestra única
- Backups automáticos diarios
- Historial de backups
- Descarga segura solo para Super Admin

✅ **Testing completo:**
- Todos los módulos probados
- Bugs críticos resueltos
- Documentación actualizada

---

## 🚨 Dependencias y Requisitos Técnicos

**Backend:**
```json
{
  "archiver": "^7.0.0",
  "adm-zip": "^0.5.10",
  "node-7z": "^3.0.0",
  "bcryptjs": "^2.4.3",
  "@nestjs/schedule": "^4.0.0"
}
```

**Frontend:**
```json
{
  "recharts": "^2.10.0",
  "@mui/x-date-pickers": "^6.18.0",
  "dayjs": "^1.11.10"
}
```

**Sistema:**
- 7-Zip instalado en servidor (`sudo apt-get install p7zip-full`)
- PostgreSQL pg_dump accesible
- Espacio en disco: mínimo 50GB para backups
- Configurar email SMTP para envío de contraseña maestra

---

**Próxima revisión:** Viernes 28 de Noviembre a las 18:00  
**Entregables:** Dashboard Financiero + Evidencias de Pago + Backups Cifrados + Testing completo
