<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

$db = (new Mannidam\Config\Database())->getConnection();

echo "=== Migrating Lead Pipeline Schema ===\n";

// 1. Upgrade sales_lead_interactions table
$db->exec("
    CREATE TABLE IF NOT EXISTS `sales_lead_interactions` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `status` VARCHAR(50) NOT NULL DEFAULT 'new_enquiry',
      `intention` VARCHAR(255) DEFAULT NULL,
      `notes` TEXT DEFAULT NULL,
      `preferred_location` VARCHAR(150) NULL,
      `budget_min` DECIMAL(15,2) NULL,
      `budget_max` DECIMAL(15,2) NULL,
      `assigned_sales_id` INT NULL,
      `assigned_advisor_id` INT NULL,
      `assigned_ops_id` INT NULL,
      `scheduled_visit_at` DATETIME NULL,
      `exit_stage` VARCHAR(50) NULL,
      `exit_reason_category` VARCHAR(100) NULL,
      `competitor_name` VARCHAR(150) NULL,
      `exit_notes` TEXT NULL,
      `reengage_date` DATE NULL,
      `discontinued_at` DATETIME NULL,
      `booked_property_id` VARCHAR(50) NULL,
      `plot_no` VARCHAR(50) NULL,
      `booking_amount` DECIMAL(12,2) NULL,
      `final_price` DECIMAL(14,2) NULL,
      `registration_date` DATE NULL,
      `deal_notes` TEXT NULL,
      `updated_by` INT DEFAULT NULL,
      `transferred_at` DATETIME DEFAULT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY `uk_user_interaction` (`user_id`),
      FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Check existing columns in sales_lead_interactions and add missing ones
$existingCols = [];
$colStmt = $db->query("DESCRIBE `sales_lead_interactions`");
while ($row = $colStmt->fetch(PDO::FETCH_ASSOC)) {
    $existingCols[$row['Field']] = $row['Type'];
}

$columnsToAdd = [
    'preferred_location'   => "VARCHAR(150) NULL AFTER `notes`",
    'budget_min'           => "DECIMAL(15,2) NULL AFTER `preferred_location`",
    'budget_max'           => "DECIMAL(15,2) NULL AFTER `budget_min`",
    'assigned_sales_id'    => "INT NULL AFTER `budget_max`",
    'assigned_advisor_id'  => "INT NULL AFTER `assigned_sales_id`",
    'assigned_ops_id'      => "INT NULL AFTER `assigned_advisor_id`",
    'scheduled_visit_at'   => "DATETIME NULL AFTER `assigned_ops_id`",
    'exit_stage'           => "VARCHAR(50) NULL AFTER `scheduled_visit_at`",
    'exit_reason_category' => "VARCHAR(100) NULL AFTER `exit_stage`",
    'competitor_name'      => "VARCHAR(150) NULL AFTER `exit_reason_category`",
    'exit_notes'           => "TEXT NULL AFTER `competitor_name`",
    'reengage_date'        => "DATE NULL AFTER `exit_notes`",
    'discontinued_at'      => "DATETIME NULL AFTER `reengage_date`",
    'booked_property_id'   => "VARCHAR(50) NULL AFTER `discontinued_at`",
    'plot_no'              => "VARCHAR(50) NULL AFTER `booked_property_id`",
    'booking_amount'       => "DECIMAL(12,2) NULL AFTER `plot_no`",
    'final_price'          => "DECIMAL(14,2) NULL AFTER `booking_amount`",
    'registration_date'    => "DATE NULL AFTER `final_price`",
    'deal_notes'           => "TEXT NULL AFTER `registration_date`",
    'created_at'           => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
];

foreach ($columnsToAdd as $col => $definition) {
    if (!isset($existingCols[$col])) {
        $db->exec("ALTER TABLE `sales_lead_interactions` ADD COLUMN `$col` $definition");
        echo "Added column $col\n";
    }
}

// Modify status to VARCHAR(50) to flexibly support all 11 stages
$db->exec("ALTER TABLE `sales_lead_interactions` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'new_enquiry'");
echo "Updated status column in sales_lead_interactions\n";

// Map legacy statuses to standard 11 stages
$db->exec("UPDATE `sales_lead_interactions` SET `status` = 'new_enquiry' WHERE `status` = 'new'");
$db->exec("UPDATE `sales_lead_interactions` SET `status` = 'customer_contacted' WHERE `status` = 'contacted'");
$db->exec("UPDATE `sales_lead_interactions` SET `status` = 'site_visit_scheduled' WHERE `status` = 'interested_site_visit'");
$db->exec("UPDATE `sales_lead_interactions` SET `status` = 'requirement_understood' WHERE `status` = 'transferred_advisor'");
echo "Mapped legacy statuses to 11 stages\n";

// 2. Create lead_stage_history table
$db->exec("
    CREATE TABLE IF NOT EXISTS `lead_stage_history` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `interaction_id` INT NULL,
      `from_stage` VARCHAR(50) NULL,
      `to_stage` VARCHAR(50) NOT NULL,
      `department` VARCHAR(50) DEFAULT 'sales',
      `action_type` VARCHAR(50) DEFAULT 'stage_transition',
      `notes` TEXT NULL,
      `metadata` JSON NULL,
      `changed_by` INT NULL,
      `changed_by_name` VARCHAR(100) NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX `idx_hist_user` (`user_id`),
      INDEX `idx_hist_stage` (`to_stage`),
      INDEX `idx_hist_created` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "Created lead_stage_history table\n";

echo "Migration finished successfully!\n";
