package com.MTA.V01.repositories;

import com.MTA.V01.models.FamilyRelationships;
import com.MTA.V01.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FamilyRelationshipsRepository extends JpaRepository<FamilyRelationships,Long> {
    FamilyRelationships findByUser_Id(Long id);

    FamilyRelationships findByRelatedUser_Id(Long id);

    boolean existsByUserAndRelatedUser(User user, User relatedUser);

    long deleteByUserAndRelatedUser(User user, User relatedUser);
}
