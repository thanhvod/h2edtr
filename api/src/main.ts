import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false })
  app.use(json({ limit: '50mb' }))
  app.use(urlencoded({ extended: true, limit: '50mb' }))
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  const corsOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:4000',
    'https://h2edtr.site',
    'https://admin.h2edtr.site',
  ]
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Device-ID', 'X-Admin-Key', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`API running at http://localhost:${port}`)
}

bootstrap().catch(console.error)
