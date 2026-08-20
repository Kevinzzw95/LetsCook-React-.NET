import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http-exception.filter';
import { validationProblem } from './common/problem-details';

function collectErrors(errors: ValidationError[]): Record<string, string[]> {
  	return Object.fromEntries(errors.map((error) => [error.property, Object.values(error.constraints ?? {})]));
}

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const config = app.get(ConfigService);
	const configuredOrigins = config.get('FRONTEND_ORIGINS', 'http://localhost:3000').split(',').map((value: string) => value.trim());
	app.enableCors({
		credentials: true,
		origin(origin, callback) {
			if (!origin) return callback(null, true);
			try {
				const url = new URL(origin);
				callback(null, configuredOrigins.includes(origin) || url.hostname === 'localhost' || url.hostname === '127.0.0.1');
			} catch { callback(null, false); }
		},
	});
	app.setGlobalPrefix('api');
	app.useGlobalPipes(new ValidationPipe({
		transform: true,
		whitelist: false,
		exceptionFactory: (errors) => validationProblem(collectErrors(errors)),
	}));
	app.useGlobalFilters(new ApiExceptionFilter());
	await app.listen(config.get<number>('PORT', 5001));
}

void bootstrap();
