using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LoyaltySystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "Mode",
                table: "LoyaltyPrograms",
                type: "smallint",
                nullable: false,
                defaultValue: (byte)0);

            migrationBuilder.CreateTable(
                name: "LoyaltyRewards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Type = table.Column<byte>(type: "smallint", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: true),
                    Cost = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoyaltyRewards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoyaltyRewards_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoyaltyRewards_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LoyaltyRedemptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    RewardId = table.Column<Guid>(type: "uuid", nullable: false),
                    RewardName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    CostPaid = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<byte>(type: "smallint", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoyaltyRedemptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoyaltyRedemptions_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoyaltyRedemptions_LoyaltyRewards_RewardId",
                        column: x => x.RewardId,
                        principalTable: "LoyaltyRewards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyPrograms_TenantId",
                table: "LoyaltyPrograms",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyRedemptions_ClientId",
                table: "LoyaltyRedemptions",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyRedemptions_RewardId",
                table: "LoyaltyRedemptions",
                column: "RewardId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyRedemptions_TenantId_CreatedAt",
                table: "LoyaltyRedemptions",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyRedemptions_TenantId_Status",
                table: "LoyaltyRedemptions",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyRewards_ProductId",
                table: "LoyaltyRewards",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyRewards_ServiceId",
                table: "LoyaltyRewards",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_LoyaltyRewards_TenantId_IsActive",
                table: "LoyaltyRewards",
                columns: new[] { "TenantId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LoyaltyRedemptions");

            migrationBuilder.DropTable(
                name: "LoyaltyRewards");

            migrationBuilder.DropIndex(
                name: "IX_LoyaltyPrograms_TenantId",
                table: "LoyaltyPrograms");

            migrationBuilder.DropColumn(
                name: "Mode",
                table: "LoyaltyPrograms");
        }
    }
}
