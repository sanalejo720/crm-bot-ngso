import React, { useState } from 'react';
import { Button, Modal, Select, Input, message } from 'antd';
import { RobotOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;

interface ReturnToBotButtonProps {
  chatId: number;
  onSuccess?: () => void;
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
}

const RETURN_REASONS = [
  {
    value: 'cliente_no_responde',
    label: '🔇 Cliente no responde',
    description: 'El cliente dejó de responder durante la conversación',
  },
  {
    value: 'solicitud_completada',
    label: '✅ Solicitud completada',
    description: 'La solicitud del cliente fue atendida exitosamente',
  },
  {
    value: 'informacion_enviada',
    label: '📄 Información enviada',
    description: 'Se envió la información solicitada al cliente',
  },
  {
    value: 'derivado_otro_canal',
    label: '📞 Derivado a otro canal',
    description: 'Cliente será atendido por otro medio (teléfono, email, etc.)',
  },
  {
    value: 'fuera_horario',
    label: '🕐 Fuera de horario',
    description: 'Consulta fuera del horario de atención',
  },
  {
    value: 'otro',
    label: '📝 Otro motivo',
    description: 'Otro motivo no listado',
  },
];

export const ReturnToBotButton: React.FC<ReturnToBotButtonProps> = ({
  chatId,
  onSuccess,
  size = 'middle',
  block = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedReason('');
    setNotes('');
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedReason('');
    setNotes('');
  };

  const handleReturnToBot = async () => {
    if (!selectedReason) {
      message.warning('Por favor selecciona un motivo');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/chats/${chatId}/return-to-bot`,
        {
          reason: selectedReason,
          notes: notes || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      message.success('✅ Chat devuelto al bot exitosamente');
      setIsModalOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error retornando chat al bot:', error);
      message.error(
        error.response?.data?.message || 'Error al devolver chat al bot',
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedReasonData = RETURN_REASONS.find((r) => r.value === selectedReason);

  return (
    <>
      <Button
        type="default"
        icon={<ArrowLeftOutlined />}
        onClick={handleOpenModal}
        size={size}
        block={block}
        style={{ borderColor: '#1890ff', color: '#1890ff' }}
      >
        Devolver al Bot
      </Button>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>Devolver chat al bot</span>
          </div>
        }
        open={isModalOpen}
        onOk={handleReturnToBot}
        onCancel={handleCancel}
        okText="Devolver al bot"
        cancelText="Cancelar"
        confirmLoading={loading}
        width={600}
        okButtonProps={{
          disabled: !selectedReason,
        }}
      >
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Motivo de devolución <span style={{ color: 'red' }}>*</span>
            </label>
            <Select
              style={{ width: '100%' }}
              placeholder="Selecciona un motivo"
              value={selectedReason || undefined}
              onChange={setSelectedReason}
              size="large"
              options={RETURN_REASONS.map((reason) => ({
                value: reason.value,
                label: reason.label,
              }))}
            />
          </div>

          {selectedReasonData && (
            <div
              style={{
                padding: 12,
                background: '#f0f7ff',
                borderRadius: 6,
                marginBottom: 16,
                border: '1px solid #bae0ff',
              }}
            >
              <div style={{ fontSize: 13, color: '#1890ff' }}>
                {selectedReasonData.description}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Notas adicionales (opcional)
            </label>
            <TextArea
              placeholder="Escribe notas adicionales sobre la devolución..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
              showCount
            />
          </div>

          <div
            style={{
              padding: 12,
              background: '#fff7e6',
              borderRadius: 6,
              border: '1px solid #ffd591',
            }}
          >
            <div style={{ fontSize: 13, color: '#fa8c16', fontWeight: 500 }}>
              ℹ️ Al devolver al bot:
            </div>
            <ul
              style={{
                fontSize: 12,
                color: '#595959',
                margin: '8px 0 0 0',
                paddingLeft: 20,
              }}
            >
              <li>Se generará un PDF con el historial del chat</li>
              <li>Se enviará un mensaje de despedida al cliente</li>
              <li>El chat quedará disponible para el bot</li>
              <li>El contador de chats del agente se reducirá</li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};
