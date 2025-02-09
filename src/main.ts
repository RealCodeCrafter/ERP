import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  app.enableCors({
    origin: "*",
    credentials: true,
  });

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, "0.0.0.0");
  console.log(`🚀 Server running on port ${PORT}`);
}

bootstrap();
