package com.MTA.V01.repositories;

import com.MTA.V01.models.InAppMessage;
import com.MTA.V01.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InAppMessagesRepository extends JpaRepository<InAppMessage,Long> {
    List<InAppMessage> findByUser(User user);

    List<InAppMessage> findByUserAndIsReadFalse(User user);
}
