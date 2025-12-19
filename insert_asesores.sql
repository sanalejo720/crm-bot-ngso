-- Script para insertar asesores desde Excel
-- Generado automáticamente

-- IDs de referencia:
-- Rol Agente: 4d8f89ab-16d8-4155-963d-276ae7d050cd
-- Campaña CASTIGO: f1bdb1f5-619b-4716-9cda-daa5f388aea1
-- Campaña DESISTIDOS: 31238141-7ac1-4f0c-864f-933f3a6032b8
-- Campaña DESOCUPADOS: 770147b5-b93b-4859-9392-0eedc9ffda0a
-- Campaña DESOCUPADOS 2022-2023: f9fc1218-6d60-4847-9c25-0d49dae9ee90

-- Password hash para bcrypt (generado con rounds=10)
-- Usaremos la cédula como password, hasheada

INSERT INTO users ("id", "fullName", "email", "password", "phone", "status", "isAgent", "agentState", "maxConcurrentChats", "currentChatsCount", "roleId", "campaignId", "createdAt", "updatedAt")
VALUES
-- CASTIGO (4 asesores)
(gen_random_uuid(), 'Luis Armando Leon Cañon', 'ellibertador25@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001001', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f1bdb1f5-619b-4716-9cda-daa5f388aea1', NOW(), NOW()),
(gen_random_uuid(), 'Angela Patricia Diaz Fernandez', 'ellibertador4@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001002', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f1bdb1f5-619b-4716-9cda-daa5f388aea1', NOW(), NOW()),
(gen_random_uuid(), 'Luisa Fernanda Beltran Guescot', 'ellibertador28@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001003', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f1bdb1f5-619b-4716-9cda-daa5f388aea1', NOW(), NOW()),
(gen_random_uuid(), 'Laura Ximena Alarcon Parra', 'ellibertador56@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001004', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f1bdb1f5-619b-4716-9cda-daa5f388aea1', NOW(), NOW()),

-- DESISTIDOS (18 asesores)
(gen_random_uuid(), 'Angie Lorena Hernandez Castiblanco', 'ellibertador1@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001005', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Yeritson Adrian Vega Acero', 'ellibertador67@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001006', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Natalia Ines Nisperuza Sanchez', 'ellibertador47@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001007', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Valery Brillit Rincon Linares', 'ellibertador5@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001008', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Johan Camilo Avila Bohorquez', 'ellibertador45@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001009', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Juan Manuel Bermudez Correa', 'ellibertador17@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001010', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Diana Rocio Naranjo Hernandez', 'ellibertador46@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001011', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Carol Tatiana Yepez Betancourth', 'ellibertador70@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001012', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Maria Fernanda Duarte Mape', 'ellibertador52@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001013', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Michel Vanesa Muños Gutierrez', 'ellibertador22@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001014', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Nicol Dallan Dominguez Carrasco', 'ellibertador14@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001015', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Maria Camila Millan Cedeno', 'ellibertador35@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001016', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Harvy Anyinzan Trujillo Camargo', 'ellibertador10@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001017', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Maria Alejandra Acosta Blanco', 'ellibertador49@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001018', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Sandi Marcela Burgos Pineda', 'ellibertador20@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001019', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Irma Rosa Diaz Barreto', 'ellibertador48@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001020', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Ginna Alejandra Perez Cifuentes', 'ellibertador3@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001021', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),
(gen_random_uuid(), 'Cristian David Diaz Melo', 'ellibertador68@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001022', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '31238141-7ac1-4f0c-864f-933f3a6032b8', NOW(), NOW()),

-- DESOCUPADOS (10 asesores)
(gen_random_uuid(), 'Luz Adriana Linares Lagos', 'ellibertador58@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001023', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Julieth Alexandra Castiblanco Rincon', 'ellibertador36@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001024', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Islena Paola Acosta Salgado', 'ellibertador32@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001025', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Sandra Milena Hernandez Corredor', 'ellibertador40@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001026', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Rafael Steven Zabala Noriega', 'ellibertador11@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001027', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Mareleimys Judith Caro Bolaño', 'ellibertador322@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001028', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Laura Daniela Zambrano Solis', 'ellibertador8@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001029', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Laura Liliana Cative Rojas', 'ellibertador19@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001030', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),
(gen_random_uuid(), 'Daniela Martinez Suarez', 'ellibertador7@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001031', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', '770147b5-b93b-4859-9392-0eedc9ffda0a', NOW(), NOW()),

-- DESOCUPADOS 2022-2023 (5 asesores)
(gen_random_uuid(), 'Karen Margarita Castellar Iriarte', 'ellibertador60@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001032', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f9fc1218-6d60-4847-9c25-0d49dae9ee90', NOW(), NOW()),
(gen_random_uuid(), 'Andres Felipe Arguello Orjuela', 'ellibertador2@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001033', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f9fc1218-6d60-4847-9c25-0d49dae9ee90', NOW(), NOW()),
(gen_random_uuid(), 'Laura Rocio Rodriguez Mora', 'ellibertador31@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001034', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f9fc1218-6d60-4847-9c25-0d49dae9ee90', NOW(), NOW()),
(gen_random_uuid(), 'Juan Daniel Cadena Sarmiento', 'ellibertador12@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001035', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f9fc1218-6d60-4847-9c25-0d49dae9ee90', NOW(), NOW()),
(gen_random_uuid(), 'Tania Lizeth Galindo Benavides', 'ellibertador6@ngsoabogados.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001036', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', 'f9fc1218-6d60-4847-9c25-0d49dae9ee90', NOW(), NOW()),

-- SUPERNUMERARIO (1 asesor - sin campaña específica)
(gen_random_uuid(), 'Erika Zubieta Mendez', 'asesor2@exialegal.com', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SrF4x4Sj1HGIOS', '3001001037', 'active', true, 'available', 5, 0, '4d8f89ab-16d8-4155-963d-276ae7d050cd', NULL, NOW(), NOW())

ON CONFLICT (email) DO NOTHING;
