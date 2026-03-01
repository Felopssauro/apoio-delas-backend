import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { access } from 'fs';
import { promisify } from 'util';

const scrypt = promisify(_scrypt)
type User = {
    userId: number;
    name: string;
    email: string;
    password: string;
};

const users: User[] = [];

@Injectable()
export class AuthService {
    constructor (private readonly jwtService: JwtService) {}
    async signUp(name: string, email:string, password:string) {
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return new BadRequestException('Email in use');
        }
        const salt = randomBytes(8).toString('hex');
        const hash = await scrypt(password, salt, 32) as Buffer;
        const saltAndHash = `${salt}.${hash.toString('hex')}`;

        const user = {
            userId: users.length + 1,
            name,
            email,
            password: saltAndHash
        };

        users.push(user);
        
        console.log("Signed up: ", user);
        const {password: _, ...result} = user;
        return result;
    }

    async signIn(email: string, password: string) {
        const user = users.find((user)=> user.email === email)
        if (!user) {
            return new UnauthorizedException("Invalid credentials");
        }
        const [salt, storedHash] = user.password.split('.');
        const hash = (await scrypt(password, salt, 32)) as Buffer;
        if (storedHash!=hash.toString('hex')){
            return new UnauthorizedException('Invalid credentials')
        }
        console.log("Signed In:", user);
        const payload = {username: user.email, sub: user.userId};
        return {accessToken: this.jwtService.sign(payload)}
    }
}
