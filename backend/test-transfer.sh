#!/bin/bash

echo "🔐 Haciendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a.prueba1@prueba.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Error en login"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:50}..."
echo ""

echo "📋 Obteniendo chats asignados..."
CHATS=$(curl -s -X GET http://localhost:3000/api/v1/chats/my-chats \
  -H "Authorization: Bearer $TOKEN")

echo "$CHATS" | head -100
echo ""

# Extraer el primer chat ID
CHAT_ID=$(echo "$CHATS" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$CHAT_ID" ]; then
  echo "⚠️ No hay chats asignados a este agente"
  exit 0
fi

echo "🎯 Chat seleccionado: $CHAT_ID"
echo ""
echo "🤖 Transfiriendo al bot..."

TRANSFER_RESPONSE=$(curl -s -X PATCH http://localhost:3000/api/v1/chats/$CHAT_ID/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"agentId":null,"reason":"Transferido al bot para prueba de flujo"}')

echo "Response: $TRANSFER_RESPONSE"
echo ""
echo "✅ Transferencia completada. Revisando logs del backend en 3 segundos..."
sleep 3

echo ""
echo "📝 Últimas líneas del log (buscando PDF y mensaje de despedida):"
pm2 logs crm-backend --lines 50 --nostream | grep -E "(PDF|despedida|chat.closed|chat.unassigned)" | tail -20
