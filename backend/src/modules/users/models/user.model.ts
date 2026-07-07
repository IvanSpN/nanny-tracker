import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';

export enum UserRole {
  WORKER = 'worker',
  CLIENT = 'client',
  ADMIN = 'admin',
}

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare login: string;

  @Unique
  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  declare email: string | null;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: 'password_hash',
  })
  declare passwordHash: string;

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
  })
  declare role: UserRole;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  declare createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  declare updatedAt: Date;

  @DeletedAt
  @Column({
    type: DataType.DATE,
    field: 'deleted_at',
  })
  declare deletedAt: Date | null;
}

export default User;
