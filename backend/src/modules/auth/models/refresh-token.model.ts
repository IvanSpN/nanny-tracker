import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../../users/models/user.model';

@Table({
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
})
export class RefreshToken extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    field: 'user_id',
  })
  declare userId: string;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING(64),
    field: 'token_hash',
  })
  declare tokenHash: string;

  @AllowNull(false)
  @Column({
    type: DataType.DATE,
    field: 'expires_at',
  })
  declare expiresAt: Date;

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
}

export default RefreshToken;
