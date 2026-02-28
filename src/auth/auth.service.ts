import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt)
type User = {
  email: string;
  password: string;
};

const users: User[] = [];

@Injectable()
export class AuthService {
    async signUp(name, email:string, password:string) {
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return new BadRequestException('Email in use');
        }
        const salt = randomBytes(8).toString('hex');
        const hash = await scrypt(password, salt, 32) as Buffer;
        const saltAndHash = `${salt}.${hash.toString('hex')}`;

        const user = {
            name,
            email,
            password: saltAndHash
        };

        users.push(user);
        
        console.log("Signed up: ", user);
        const {password: _, ...result} = user;
        return result;
    }
}
